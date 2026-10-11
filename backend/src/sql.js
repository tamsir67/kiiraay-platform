/** Petit constructeur de clauses WHERE paramétrées (jamais de concaténation de valeurs). */
export class Where {
  constructor(params = []) {
    this.parts = [];
    this.params = params;
  }
  /** Ajoute une condition ; chaque `?` est remplacé par $n. */
  add(cond, ...values) {
    let i = 0;
    const sql = cond.replace(/\?/g, () => {
      this.params.push(values[i++]);
      return `$${this.params.length}`;
    });
    this.parts.push(`(${sql})`);
    return this;
  }
  raw(cond) { this.parts.push(`(${cond})`); return this; }
  param(v) { this.params.push(v); return `$${this.params.length}`; }
  toString() { return this.parts.length ? `WHERE ${this.parts.join(' AND ')}` : ''; }
  and() { return this.parts.length ? ` AND ${this.parts.join(' AND ')}` : ''; }
}
