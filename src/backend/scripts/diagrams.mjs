// Writes the ERD, the entity class diagram and the data dictionary from the
// TypeORM entity metadata, so the diagrams always match the code.
//
//   npm run diagrams        (builds first; no database connection needed)
//
// Output: docs/diagrams/erd.md, docs/diagrams/class-diagram.md (the entity
// part; the service part below it is written by hand and kept), and
// docs/design/data-dictionary.md. Sorted, so a re-run only changes what the
// entities changed.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../dist/database/data-source-options.js';

const here = dirname(fileURLToPath(import.meta.url));
const docs = resolve(here, '../../../docs');

/** Subsystems, as in docs/design/domain-model.md. */
const GROUPS = [
  [
    'Catalogue',
    ['Medicine', 'MedicineCategory', 'UnitOfMeasure', 'MedicinePrice'],
  ],
  ['Purchasing', ['Supplier', 'GoodsReceipt', 'GoodsReceiptLine']],
  [
    'Stock and control',
    [
      'Batch',
      'StockMovement',
      'StockTake',
      'StockTakeLine',
      'StockTakeMedicine',
      'StockTakeCounter',
      'StockAlert',
    ],
  ],
  [
    'Prescriptions and dispensing',
    [
      'Customer',
      'Prescriber',
      'Prescription',
      'PrescriptionItem',
      'DispenseLine',
    ],
  ],
  ['Sales and returns', ['Sale', 'SaleLine', 'SaleReturn', 'ReturnLine']],
  [
    'Access and infrastructure',
    [
      'User',
      'Role',
      'Permission',
      'role_permissions',
      'AuditLog',
      'ProcessedRequest',
    ],
  ],
];

/**
 * Entities that no service, controller or rule reads or writes yet, with the
 * reason (#71). They are drawn with a <<not used yet>> stereotype.
 */
const UNUSED = {};

/** Links the database does not enforce, so metadata cannot show them. */
const LOGICAL = [
  'StockMovement.sourceDocumentType + sourceDocumentId point to the receipt, dispense line, sale line, return line or stock-take line that caused the movement. They are not a foreign key: one column pair serves five tables.',
  'Two triggers written by hand in the initial migration guard `stock_movements`: `stock_movements_append_only` refuses UPDATE and DELETE (BR05), and `stock_movements_check_reversal` checks that a reversal is the exact negation of the movement it reverses.',
];

const ds = new DataSource(dataSourceOptions());
await ds.buildMetadatas();
const metas = [...ds.entityMetadatas].sort((a, b) =>
  a.name.localeCompare(b.name),
);
const byName = new Map(metas.map((m) => [m.name, m]));
// A group may list an entity a pending pull request adds; skip it until the
// entity exists, so the script runs on main before and after the merge.
for (const group of GROUPS) group[1] = group[1].filter((n) => byName.has(n));
const groupOf = new Map(
  GROUPS.flatMap(([g, names]) => names.map((n) => [n, g])),
);
const missing = metas.filter((m) => !groupOf.has(m.name)).map((m) => m.name);
if (missing.length)
  throw new Error(`Entities without a group: ${missing.join(', ')}`);

const dbType = (c) => {
  const t = ds.driver.normalizeType(c);
  if (c.enum) return 'enum';
  if (t === 'character varying')
    return c.length ? `varchar(${c.length})` : 'varchar';
  if (t === 'numeric') return `numeric(${c.precision},${c.scale})`;
  if (t === 'timestamp with time zone') return 'timestamptz';
  return t;
};
const token = (s) => s.replace(/[^A-Za-z0-9_]/g, '_');
const uniqueCols = (m) =>
  new Set(
    m.uniques
      .filter((u) => u.columns.length === 1)
      .map((u) => u.columns[0].databaseName),
  );

/** Relations from the side that holds the foreign key, so each appears once. */
const owningRelations = (m) =>
  m.relations
    .filter((r) => r.isManyToOne || (r.isOneToOne && r.isOwning))
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName));

// ---------------------------------------------------------------- ERD
function erd(groupName, names) {
  const inGroup = new Set(names);
  const lines = ['```mermaid', 'erDiagram'];
  const external = new Set();
  for (const name of names) {
    const m = byName.get(name);
    const uq = uniqueCols(m);
    lines.push(`    ${token(m.tableName)} {`);
    for (const c of m.columns) {
      const keys = [
        c.isPrimary && 'PK',
        c.relationMetadata && 'FK',
        uq.has(c.databaseName) && 'UK',
      ]
        .filter(Boolean)
        .join(', ');
      // Mermaid types are single words; length and precision are in the dictionary.
      const type = dbType(c).replace(/\(.*\)$/, '');
      lines.push(
        `        ${token(type)} ${token(c.databaseName)}${keys ? ` ${keys}` : ''}`,
      );
    }
    lines.push('    }');
  }
  for (const name of names) {
    const m = byName.get(name);
    for (const r of owningRelations(m)) {
      const target = r.inverseEntityMetadata;
      if (!inGroup.has(target.name)) external.add(target.tableName);
      const parent = r.isNullable ? '|o' : '||';
      const child = r.isOneToOne ? (r.isNullable ? 'o|' : '||') : 'o{';
      const label =
        r.joinColumns.map((j) => j.databaseName).join(', ') || r.propertyName;
      lines.push(
        `    ${token(target.tableName)} ${parent}--${child} ${token(m.tableName)} : "${label}"`,
      );
    }
    // A many-to-many junction table has foreign keys but no relations of its own.
    if (m.tableType === 'junction') {
      for (const fk of m.foreignKeys) {
        const target = fk.referencedEntityMetadata;
        if (!inGroup.has(target.name)) external.add(target.tableName);
        lines.push(
          `    ${token(target.tableName)} ||--o{ ${token(m.tableName)} : "${fk.columnNames.join(', ')}"`,
        );
      }
    }
  }
  for (const t of [...external].sort())
    lines.push(`    ${token(t)} {`, '        uuid id PK', '    }');
  lines.push('```');
  return [`### ${groupName}`, '', ...lines, ''];
}

// ------------------------------------------------- entity class diagram
function classes(groupName, names) {
  const lines = ['```mermaid', 'classDiagram'];
  const enums = new Map();
  for (const name of names) {
    const m = byName.get(name);
    if (m.tableType === 'junction') continue;
    lines.push(`    class ${m.name} {`);
    if (UNUSED[m.name]) lines.push('        <<not used yet>>');
    for (const c of m.columns) {
      if (c.relationMetadata) continue;
      const type = c.enum
        ? c.enumName ||
          `${m.name}${c.propertyName[0].toUpperCase()}${c.propertyName.slice(1)}`
        : dbType(c).replace(/\(.*\)$/, '');
      if (c.enum) enums.set(type, c.enum);
      lines.push(
        `        +${token(type)} ${c.propertyName}${c.isNullable ? '?' : ''}`,
      );
    }
    lines.push('    }');
  }
  for (const name of names) {
    const m = byName.get(name);
    for (const r of owningRelations(m)) {
      const target = r.inverseEntityMetadata;
      if (target.tableType === 'junction') continue;
      const many = r.isOneToOne ? (r.isNullable ? '0..1' : '1') : '*';
      const one = r.isNullable ? '0..1' : '1';
      lines.push(
        `    ${m.name} "${many}" --> "${one}" ${target.name} : ${r.propertyName}`,
      );
    }
    for (const r of m.relations.filter((r) => r.isManyToMany && r.isOwning)) {
      lines.push(
        `    ${m.name} "*" --> "*" ${r.inverseEntityMetadata.name} : ${r.propertyName}`,
      );
    }
  }
  for (const [type, values] of [...enums].sort()) {
    lines.push(
      `    class ${token(type)} {`,
      '        <<enumeration>>',
      ...values.map((v) => `        ${v}`),
      '    }',
    );
  }
  lines.push('```');
  return [`### ${groupName}`, '', ...lines, ''];
}

// ---------------------------------------------------- data dictionary
function dictionary(m) {
  const uq = uniqueCols(m);
  const out = [`### \`${m.tableName}\` — ${m.name}`, ''];
  out.push(
    '| Column | Type | Null | Default | Key | Notes |',
    '|---|---|---|---|---|---|',
  );
  for (const c of m.columns) {
    // From the foreign keys, not the relation: a junction table has columns
    // pointing to two tables but no relation of its own.
    const target = m.foreignKeys.find((f) =>
      f.columnNames.includes(c.databaseName),
    )?.referencedEntityMetadata.tableName;
    const fk = target ? `FK → \`${target}\`` : '';
    const key = [c.isPrimary && 'PK', fk, uq.has(c.databaseName) && 'unique']
      .filter(Boolean)
      .join(', ');
    let def = '';
    if (typeof c.default === 'function') def = c.default();
    else if (c.default !== undefined) def = String(c.default);
    if (c.isCreateDate && !def) def = 'now()';
    if (c.isGenerated && c.generationStrategy === 'uuid')
      def = 'gen_random_uuid()';
    const notes = c.enum ? c.enum.map((v) => `\`${v}\``).join(', ') : '';
    out.push(
      `| \`${c.databaseName}\` | ${dbType(c)} | ${c.isNullable ? 'yes' : 'no'} | ${def ? `\`${def}\`` : ''} | ${key} | ${notes} |`,
    );
  }
  const extra = [];
  for (const u of m.uniques.filter((u) => u.columns.length > 1)) {
    extra.push(
      `- Unique \`${u.name}\`: (${u.columns.map((c) => `\`${c.databaseName}\``).join(', ')})`,
    );
  }
  for (const i of m.indices) {
    const where = i.where ? ` where \`${i.where}\`` : '';
    extra.push(
      `- ${i.isUnique ? 'Unique index' : 'Index'} \`${i.name}\`: (${i.columns.map((c) => `\`${c.databaseName}\``).join(', ')})${where}`,
    );
  }
  for (const ch of m.checks)
    extra.push(
      `- Check \`${ch.name}\`: \`${ch.expression.replace(/\s+/g, ' ')}\``,
    );
  if (extra.length) out.push('', ...extra);
  out.push('');
  return out;
}

const header = (title, intro) => [
  `# ${title}`,
  '',
  '> Generated from the TypeORM entities by `npm run diagrams` in `src/backend`.',
  '> Do not edit by hand; change the entity and run it again.',
  '',
  ...intro,
  '',
];
const logical = [
  '## Links the database does not enforce',
  '',
  ...LOGICAL.map((l) => `- ${l}`),
  '',
];

writeFileSync(
  resolve(docs, 'diagrams/erd.md'),
  [
    ...header('Entity–relationship diagram', [
      `${metas.length} tables in six subsystems. Crow's feet read as usual: \`||--o{\` is one parent to zero or more children; \`|o\` marks an optional parent (nullable foreign key). A table from another subsystem appears as a stub with its key only.`,
    ]),
    ...GROUPS.flatMap(([g, names]) => erd(g, names)),
    ...logical,
  ].join('\n'),
);

const classFile = resolve(docs, 'diagrams/class-diagram.md');
const marker = '<!-- END GENERATED -->';
let kept = '';
try {
  const old = readFileSync(classFile, 'utf8');
  if (old.includes(marker))
    kept = old.slice(old.indexOf(marker) + marker.length);
} catch {
  // first run
}
writeFileSync(
  classFile,
  [
    ...header('Class diagram', [
      'Part 1 shows the persistent classes (TypeORM entities) with their attributes, enumerations and associations, generated. Part 2, below the marker, shows the services and domain classes that hold the business rules; it is written by hand.',
      '',
      '## Part 1 — Entities (generated)',
      '',
      ...(Object.keys(UNUSED).length
        ? [
            'Marked <<not used yet>>, because nothing in the application reads or writes them so far:',
            '',
            ...Object.entries(UNUSED).map(([n, why]) => `- \`${n}\`: ${why}`),
            '',
          ]
        : ['Every entity is read or written by the application; none is unused.', '']),
    ]),
    ...GROUPS.flatMap(([g, names]) => classes(g, names)),
    marker,
  ].join('\n') + (kept || '\n'),
);

writeFileSync(
  resolve(docs, 'design/data-dictionary.md'),
  [
    ...header('Data dictionary', [
      'Every table and column, with its type, nullability, default and keys; enumerations list their values; table constraints (multi-column unique, indexes, checks) follow each table. What the tables mean is in [`domain-model.md`](domain-model.md).',
    ]),
    ...GROUPS.flatMap(([g, names]) => [
      `## ${g}`,
      '',
      ...names.flatMap((n) => dictionary(byName.get(n))),
    ]),
    ...logical,
  ].join('\n'),
);
console.log(
  `Wrote erd.md, class-diagram.md and data-dictionary.md for ${metas.length} tables.`,
);
