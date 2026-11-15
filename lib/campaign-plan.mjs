// A scheduled cell is a full article; short installation checks are run separately.
export function validateCampaignCell(cell) {
  if (cell.smoke !== undefined && cell.smoke !== false) throw new Error('Campaign cells must use the full article');
  if (!['cpu', 'webgpu'].includes(cell.backend) || !['warm', 'cached', 'cold', 'network', 'offline'].includes(cell.scenario)) {
    throw new Error('Invalid campaign cell');
  }
  const minimum = cell.scenario === 'warm' ? 5 : 1;
  if (!Number.isSafeInteger(cell.repetitions) || cell.repetitions < minimum || cell.repetitions > 100) {
    throw new Error('Invalid campaign repetitions');
  }
  if (cell.timeoutMinutes !== undefined && (!Number.isFinite(cell.timeoutMinutes) || cell.timeoutMinutes <= 0 || cell.timeoutMinutes > 1440)) {
    throw new Error('Invalid per-article timeout');
  }
  if (cell.resources !== undefined && typeof cell.resources !== 'boolean') throw new Error('Invalid resources flag');
}
