const parseId = (value) => Number(value);

const buildListPayload = (body) => ({
  skip: body.skip,
  limit: body.limit,
  sort: body.sort,
  filters: body.filters,
});

const withActor = (payload, user) => {
  if (!user?.id) return payload;
  return {
    ...payload,
    created_by: payload.created_by ?? user.id,
    updated_by: user.id,
  };
};

module.exports = {
  parseId,
  buildListPayload,
  withActor,
};
