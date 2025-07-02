export const getPagination = (page = 0, size = 10) => {
  const limit = Math.min(size, 100);
  const offset = page * limit;
  return { limit, offset };
};

export const getPagingData = (data, page, limit) => {
  const { count: totalItems, rows: items } = data;
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = Number(page);

  return {
    totalItems,
    items,
    totalPages,
    currentPage
  };
};