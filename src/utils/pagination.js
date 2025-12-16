// Description: Pagination utility functions.
/**
 * @param {number} totalItems
 * @param {number} page
 * @param {number} limit
 * @returns
 */

const calculatePagination = (totalItems, page = 1, limit = 10) => {
  const totalPages = Math.ceil(totalItems / limit);
  const nextPage = page < totalPages ? page + 1 : null;

  return {
    total: totalItems,
    totalPages,
    page,
    limit,
    nextPage,
  };
};

module.exports = {
  calculatePagination,
};

