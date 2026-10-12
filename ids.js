// Stable ids / slugs for reports. Dependency-free.
export const slug = (name) => String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const reportId = (municipality, reportNo) => `${slug(municipality)}_${reportNo}`;
