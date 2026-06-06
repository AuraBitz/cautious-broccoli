const parseId = (value) => Number(value);

const buildListPayload = (body) => {
  const payload = {
    skip: body.skip,
    limit: body.limit,
    sort: body.sort,
    filters: body.filters,
  };

  if (body.scope_project_id != null) {
    payload.scope_project_id = body.scope_project_id;
  }

  return payload;
};

/** created_by / updated_by FKs reference client_login_master — not employee_login_master. */
const isClientLoginActor = (user) =>
  Boolean(user?.id) && user.accountType !== 'employee';

const withActor = (payload, user) => {
  if (!isClientLoginActor(user)) return payload;
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
