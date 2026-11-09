/** Returns the only row of an insert or aggregate that always yields one, and fails loudly if it did not. */
export function single<T>(rows: T[]): T {
    const [row] = rows;
    if (row === undefined) throw new Error("Expected one row, got none");
    return row;
}
