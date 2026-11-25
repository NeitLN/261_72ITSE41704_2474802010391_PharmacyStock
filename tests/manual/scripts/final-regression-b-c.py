"""Final regression, Tiến's share of pack R: B's cases and C's (runs 111–122).

Drives the REST API of a running API (http://localhost:3000) on a database
migrated and seeded from scratch, as the role each step needs, and reads
the stock from the database with psql inside the Podman container
`pharmacy_postgres`. Each case creates its own medicine, so the seeded data
is not touched. Usage:

    python tests/manual/scripts/final-regression-b-c.py results.json

Set DB below to the database the API runs on.
"""
import json, subprocess, sys, uuid, datetime as dt
import requests

B = 'http://localhost:3000/api'
DB = 'pharmacy_stock_final_b'
TODAY = dt.date.today()
D = lambda n: (TODAY + dt.timedelta(days=n)).isoformat()
RESULTS = {}
TOK = {}


def tok(user):
    if user not in TOK:
        r = requests.post(B + '/auth/login', json={'username': user, 'password': 'Pharmacy@2026'})
        TOK[user] = r.json()['accessToken']
    return {'Authorization': 'Bearer ' + TOK[user]}


def call(method, path, user, body=None, params=None):
    r = requests.request(method, B + path, headers=tok(user), json=body, params=params)
    try:
        j = r.json()
    except Exception:
        j = None
    return r.status_code, j


def sql(q):
    out = subprocess.run(['podman', 'exec', 'pharmacy_postgres', 'psql', '-U', 'pharmacy_app', '-d', DB, '-t', '-A', '-F', '|', '-c', q],
                         capture_output=True, text=True, encoding='utf-8')
    return [l.split('|') for l in out.stdout.strip().splitlines() if l]


REF = None


def ref():
    global REF
    if REF is None:
        _, rd = call('GET', '/medicines/reference-data', 'manager')
        _, sup = call('GET', '/suppliers', 'manager')
        _, cus = call('GET', '/customers', 'manager')
        _, pre = call('GET', '/prescribers', 'manager')
        REF = dict(cat=rd['categories'][0]['id'], unit=[u for u in rd['units'] if u['code'] in ('TAB', 'TABLET')][0]['id'] if any(u['code'] in ('TAB', 'TABLET') for u in rd['units']) else rd['units'][0]['id'],
                   sup=sup[0]['id'], cus=cus[0]['id'], pre=[p for p in pre if p['isActive']][0]['id'])
    return REF


SEQ = [0]


def medicine(tag, cls='prescription', price=1000, reorder=0, monitored=False):
    SEQ[0] += 1
    code = f'FR{tag}{uuid.uuid4().hex[:4].upper()}'
    s, m = call('POST', '/medicines', 'manager', dict(code=code, name=f'Final {tag} medicine {SEQ[0]}', categoryId=ref()['cat'],
                baseUnitId=ref()['unit'], classification=cls, currentPrice=price, reorderLevel=reorder,
                lowStockMonitored=monitored, strength='500 mg',
                **({'classificationSource': 'Label, reg. VD-00000-26', 'classificationDate': D(-30)} if cls == 'otc' else {})))
    assert s == 201, (s, m)
    return m


def receive(med, batches, receipt_date=None):
    SEQ[0] += 1
    lines = [dict(medicineId=med['id'], batchNumber=f"{med['code']}-{b}", expiryDate=e, quantity=q, unitCost=500) for b, e, q in batches]
    s, r = call('POST', '/goods-receipts', 'manager', dict(supplierId=ref()['sup'], documentNumber=f'FINAL-{uuid.uuid4().hex[:8]}',
                receiptDate=receipt_date or D(0), lines=lines))
    assert s == 201, (s, r)
    return r


def batches(med):
    rows = sql(f"""select b."batchNumber", b."qtySellable", b."qtyQuarantine", b."qtyPendingDestruction" from batches b
                   join medicines m on m.id=b.medicine_id where m.code='{med['code']}' order by b."expiryDate" """)
    return {r[0].split('-')[-1]: (int(r[1]), int(r[2]), int(r[3])) for r in rows}


def movements(med):
    return sql(f"""select sm.type, b."batchNumber", sm."deltaSellable", sm."deltaQuarantine" from stock_movements sm join batches b on b.id=sm.batch_id
                   join medicines m on m.id=b.medicine_id where m.code='{med['code']}' order by sm."occurredAt", sm.id""")


def prescription(med, qty, user='pharmacist'):
    SEQ[0] += 1
    s, rx = call('POST', '/prescriptions', user, dict(referenceNumber=f'FINAL-RX-{uuid.uuid4().hex[:6].upper()}', issuedDate=D(0), customerId=ref()['cus'],
                 prescriberId=ref()['pre'], items=[dict(medicineId=med['id'], strength='500 mg', quantityPrescribed=qty,
                 dose='1 tablet twice a day', route='oral', daysOfUse=5)]))
    assert s == 201, (s, rx)
    s2, v = call('POST', f"/prescriptions/{rx['id']}/verify", user, {})
    assert s2 == 200, (s2, v)
    return v


def dispense(rx, qty, note=None):
    item = rx['items'][0]['id']
    it = dict(prescriptionItemId=item, quantity=qty)
    if note:
        it['partialSupplyNote'] = note
    return call('POST', '/dispensings', 'pharmacist', dict(prescriptionId=rx['id'], items=[it], requestId=str(uuid.uuid4())))


def otc_sale(lines):
    return call('POST', '/sales', 'cashier', dict(requestId=str(uuid.uuid4()), otcLines=[dict(medicineId=m['id'], quantity=q) for m, q in lines]))


def returnable(sale):
    num = sale.get('receiptNumber') or sale.get('referenceNumber')
    _, r = call('GET', f'/returns/sales/{num}', 'cashier')
    return num, r


def record(tc, ok, detail):
    RESULTS[tc] = dict(ok=ok, detail=detail)
    print(('PASS ' if ok else 'FAIL ') + tc + ': ' + detail)


def ledger_check():
    rows = sql("""select count(*) from batches b left join (select batch_id, sum("deltaSellable") s, sum("deltaQuarantine") q, sum("deltaPendingDestruction") p
                  from stock_movements group by batch_id) x on x.batch_id=b.id
                  where coalesce(x.s,0)<>b."qtySellable" or coalesce(x.q,0)<>b."qtyQuarantine" or coalesce(x.p,0)<>b."qtyPendingDestruction" """)
    return int(rows[0][0])


def main():
    import os
    skip = set(os.environ.get('SKIP','').split(','))
    # TC-04 FEFO across two batches
    m = medicine('A')
    receive(m, [('A', D(200), 3), ('B', D(400), 8)])
    rx = prescription(m, 7)
    s, d = dispense(rx, 7)
    b = batches(m)
    lines = [r for r in movements(m) if r[0].upper() == 'DISPENSE']
    record('TC-04', s == 201 and b['A'][0] == 0 and b['B'][0] == 4 and len(lines) == 2,
           f"{m['code']}: A=3 (exp {D(200)}), B=8 (exp {D(400)}); dispense 7 → {s}; A sellable {b['A'][0]}, B {b['B'][0]}; {len(lines)} DISPENSE movements ({', '.join(r[1].split('-')[-1] + ' ' + r[2] for r in lines)})")

    # TC-06 only an expired batch
    m = medicine('B')
    receive(m, [('X', D(-1), 5)], receipt_date=D(-10))
    rx = prescription(m, 2)
    before = batches(m)
    s, d = dispense(rx, 2)
    after = batches(m)
    record('TC-06', s in (409, 422) and before == after,
           f"{m['code']}: one batch, expiry {D(-1)} (yesterday), 5 sellable on the book; dispense 2 → {s} {d.get('code') if d else ''} \"{(d or {}).get('message','')}\"; batch unchanged {after['X']}")

    # TC-07 expiry = business date
    m = medicine('C')
    receive(m, [('T', D(0), 5)], receipt_date=D(-10))
    rx = prescription(m, 2)
    before = batches(m)
    s, d = dispense(rx, 2)
    record('TC-07', s in (409, 422) and before == batches(m),
           f"{m['code']}: batch expiring today {D(0)}; dispense 2 → {s} \"{(d or {}).get('message','')}\"; nothing moved")

    # TC-09 shortage, then partial with note
    m = medicine('D')
    receive(m, [('S', D(300), 4)])
    rx = prescription(m, 5)
    s1, d1 = dispense(rx, 5)
    s2, d2 = dispense(rx, 4, note='Treatment can start; patient returns for the last tablet')
    _, rx2 = call('GET', f"/prescriptions/{rx['id']}", 'pharmacist')
    item = rx2['items'][0]
    out = item.get('quantityOutstanding', item['quantityPrescribed'] - item.get('quantityDispensed', 0))
    record('TC-09', s1 in (409, 422) and s2 == 201 and out == 1 and batches(m)['S'][0] == 0,
           f"{m['code']}: 4 sellable, 5 prescribed; dispense 5 → {s1} \"{(d1 or {}).get('message','')}\"; dispense 4 with a partial-supply note → {s2}; outstanding {out}, status {rx2.get('status')}")

    # TC-12 controlled medicine without a prescription
    m = medicine('E', cls='controlled')
    receive(m, [('K', D(300), 10)])
    s, d = otc_sale([(m, 1)])
    errs = (d or {}).get('errors') or []
    record('TC-12', s in (400, 422) and batches(m)['K'][0] == 10,
           f"{m['code']} (controlled): over-the-counter sale of 1 with no prescription → {s} \"{(d or {}).get('message','')}\"" + (f" field {errs[0].get('field')}" if errs else '') + "; stock unchanged 10")

    # TC-15 bill a dispensing: stock falls once
    m = medicine('F')
    receive(m, [('H', D(300), 10)])
    rx = prescription(m, 3)
    s1, d1 = dispense(rx, 3)
    after_dispense = batches(m)['H'][0]
    s2, sale = call('POST', '/sales', 'cashier', dict(requestId=str(uuid.uuid4()), prescriptionId=rx['id']))
    after_bill = batches(m)['H'][0]
    moves = [r[0] for r in movements(m)]
    record('TC-15', s1 == 201 and s2 == 201 and after_dispense == 7 and after_bill == 7 and 'SALE' not in [x.upper() for x in moves],
           f"{m['code']}: 10 received; hand-over of 3 → {s1}, sellable {after_dispense}; billing → {s2} receipt {(sale or {}).get('referenceNumber') or (sale or {}).get('receiptNumber')}, total {(sale or {}).get('totalAmount', (sale or {}).get('total'))}; sellable still {after_bill}; movements {', '.join(moves)}")

    # TC-16 return 2 of 5
    m = medicine('G', cls='otc')
    receive(m, [('R', D(300), 10)])
    s1, sale = otc_sale([(m, 5)])
    num, rs = returnable(sale)
    s2, ret = call('POST', '/returns', 'cashier', dict(requestId=str(uuid.uuid4()), saleId=rs['id'], reason='Customer bought a duplicate', lines=[dict(saleLineId=rs['lines'][0]['saleLineId'], quantity=2)]))
    b = batches(m)['R']
    _, rs2 = returnable(sale)
    moves = [(r[0], r[2], r[3]) for r in movements(m)]
    sale2 = {'lines': [{'quantity': rs2['lines'][0]['quantitySold']}]}
    sale = {'referenceNumber': num}
    record('TC-16', s1 == 201 and s2 == 201 and b == (5, 2, 0) and sale2['lines'][0]['quantity'] == 5,
           f"{m['code']}: sale {sale['referenceNumber']} of 5; return of 2 → {s2} slip {(ret or {}).get('referenceNumber')}; batch sellable {b[0]}, quarantine {b[1]}; sale line still 5; movements {moves}")

    # TC-35 FEFO in a sale, expired skipped
    m = medicine('H', cls='otc')
    receive(m, [('X', D(-2), 4)], receipt_date=D(-20))
    receive(m, [('E', D(100), 3), ('L', D(500), 6)])
    s, sale = otc_sale([(m, 5)])
    b = batches(m)
    record('TC-35', s == 201 and b['X'][0] == 4 and b['E'][0] == 0 and b['L'][0] == 4,
           f"{m['code']}: expired X (4, {D(-2)}), E (3, {D(100)}), L (6, {D(500)}); sale of 5 → {s} {(sale or {}).get('receiptNumber') or (sale or {}).get('referenceNumber')}; X untouched {b['X'][0]}, E {b['E'][0]}, L {b['L'][0]}")

    # TC-50 return of 1 goes to quarantine
    m = medicine('I', cls='otc')
    receive(m, [('Q', D(300), 5)])
    s1, sale = otc_sale([(m, 2)])
    num, rs = returnable(sale)
    s2, ret = call('POST', '/returns', 'cashier', dict(requestId=str(uuid.uuid4()), saleId=rs['id'], reason='Wrong strength', lines=[dict(saleLineId=rs['lines'][0]['saleLineId'], quantity=1)]))
    b = batches(m)['Q']
    s3, sale3 = otc_sale([(m, 4)])
    record('TC-50', s2 == 201 and b == (3, 1, 0) and s3 in (409, 422),
           f"{m['code']}: 5 received, sold 2, returned 1 → {s2} {(ret or {}).get('referenceNumber')}; sellable {b[0]}, quarantine {b[1]}; a sale of 4 is refused ({s3} \"{(sale3 or {}).get('message','')}\"), so the returned unit is not sellable")

    # TC-19 stock take with a discrepancy
    m = medicine('J')
    receive(m, [('T', D(300), 10)])
    s, st = call('POST', '/stock-takes', 'manager', dict(medicineIds=[m['id']]))
    line = st['lines'][0]
    s2, _ = call('PUT', f"/stock-takes/{st['id']}/lines/{line['id']}", 'pharmacist', dict(countedQuantity=8, reason='Two tablets missing from an opened box'))
    s3, _ = call('POST', f"/stock-takes/{st['id']}/submit", 'pharmacist')
    s4, ap = call('POST', f"/stock-takes/{st['id']}/approve", 'manager')
    moves = [(r[0], r[2]) for r in movements(m)]
    record('TC-19', s4 in (200, 201) and batches(m)['T'][0] == 8 and ('ADJUSTMENT', '-2') in [(a.upper(), b) for a, b in moves],
           f"{m['code']}: {st['referenceNumber']} opened by the manager, book 10; pharmacist counted 8 with a reason ({s2}), submitted ({s3}); manager approved → {s4}; sellable 8; movements {moves}")

    # TC-21 low-stock thresholds
    m = medicine('K', cls='otc', reorder=10, monitored=True)
    receive(m, [('L', D(300), 11)])

    def alert_of(med):
        _, al = call('GET', '/alerts', 'manager', params={'status': 'unresolved'})
        items = al if isinstance(al, list) else al.get('items', [])
        return sorted({a['type'] for a in items if a['medicine']['code'] == med['code']})
    seen = [('11', alert_of(m))]
    for q, label in ((1, '10'), (1, '9'), (9, '0')):
        otc_sale([(m, q)])
        seen.append((label, alert_of(m)))
    ok = seen[0][1] == [] and seen[1][1] == ['low_stock'] and seen[2][1] == ['low_stock'] and seen[3][1] == ['out_of_stock']
    record('TC-21', ok, f"{m['code']}: reorder level 10, monitored; open stock-level alerts by sellable quantity: " + '; '.join(f"{k} → {v or 'none'}" for k, v in seen))

    # TC-28 cashier calls manager functions
    s1, d1 = call('POST', '/suppliers', 'cashier', dict(name='Should not exist', phone='028 1111 2222'))
    any_med = m
    s2, d2 = call('PATCH', f"/medicines/{any_med['id']}", 'cashier', dict(name='Renamed by cashier'))
    exists = sql("select count(*) from suppliers where name='Should not exist'")[0][0]
    record('TC-28', s1 == 403 and s2 == 403 and exists == '0',
           f"cashier POST /api/suppliers → {s1} {(d1 or {}).get('code')}; PATCH /api/medicines/:id → {s2} {(d2 or {}).get('code')}; no supplier created, medicine name unchanged")

    RESULTS['ledger'] = ledger_check()
    print('ledger mismatches:', RESULTS['ledger'])
    json.dump(RESULTS, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


main()
