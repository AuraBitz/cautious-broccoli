const dataaccess = require('../dataaccess');

const EXPIRED_PLAN_STATUS = 'Deactivate';
const EXPIRED_LOGIN_STATUS = 'inactive';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const computeRemainDays = (planStartAt, planValidDays) => {
  if (!planStartAt || planValidDays == null) return null;

  const start = new Date(planStartAt);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + Number(planValidDays));

  const diffMs = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / MS_PER_DAY));
};

const buildPlanMap = (plans) =>
  plans.reduce((map, plan) => {
    map[plan.id] = plan;
    return map;
  }, {});

const applyPlanSync = async (client, planMap) => {
  if (!client?.plan_start_at || !client?.plan_id) {
    return client;
  }

  const plan = planMap[client.plan_id];
  if (!plan) {
    return client;
  }

  const remainDays = computeRemainDays(
    client.plan_start_at,
    plan.plan_valid_days
  );

  if (remainDays === 0) {
    const updatedClient = await dataaccess.clientManagement.updatePlanFields(
      client.id,
      {
        plan_remain_days: 0,
        plan_status: EXPIRED_PLAN_STATUS,
      }
    );

    if (client.login_id) {
      await dataaccess.clientLoginMaster.updateStatus(
        client.login_id,
        EXPIRED_LOGIN_STATUS
      );
    }

    return (
      updatedClient || {
        ...client,
        plan_remain_days: 0,
        plan_status: EXPIRED_PLAN_STATUS,
      }
    );
  }

  if (client.plan_remain_days !== remainDays) {
    const updatedClient = await dataaccess.clientManagement.updatePlanFields(
      client.id,
      {
        plan_remain_days: remainDays,
        plan_status: client.plan_status,
      }
    );
    return updatedClient || { ...client, plan_remain_days: remainDays };
  }

  return { ...client, plan_remain_days: remainDays };
};

const syncClientPlan = async (client) => {
  if (!client) return client;

  if (!client.plan_start_at || !client.plan_id) {
    return client;
  }

  const plan = await dataaccess.plansMaster.findById(client.plan_id);
  const planMap = plan ? buildPlanMap([plan]) : {};
  return applyPlanSync(client, planMap);
};

const syncClientsPlan = async (clients) => {
  if (!clients?.length) return clients;

  const planIds = [
    ...new Set(
      clients.filter((c) => c.plan_start_at && c.plan_id).map((c) => c.plan_id)
    ),
  ];

  const plans = await dataaccess.plansMaster.findByIds(planIds);
  const planMap = buildPlanMap(plans);

  return Promise.all(clients.map((client) => applyPlanSync(client, planMap)));
};

const preparePlanOnSave = async (payload) => {
  if (!payload.plan_start_at || !payload.plan_id) {
    return payload;
  }

  const plan = await dataaccess.plansMaster.findById(payload.plan_id);
  if (!plan) {
    return payload;
  }

  const remainDays = computeRemainDays(
    payload.plan_start_at,
    plan.plan_valid_days
  );
  const isExpired = remainDays === 0;

  return {
    ...payload,
    plan_remain_days: remainDays,
    plan_status: isExpired
      ? EXPIRED_PLAN_STATUS
      : payload.plan_status || 'Active',
  };
};

const deactivateLoginIfExpired = async (loginId, isExpired) => {
  if (!loginId || !isExpired) return;
  await dataaccess.clientLoginMaster.updateStatus(
    loginId,
    EXPIRED_LOGIN_STATUS
  );
};

module.exports = {
  computeRemainDays,
  syncClientPlan,
  syncClientsPlan,
  preparePlanOnSave,
  deactivateLoginIfExpired,
  EXPIRED_PLAN_STATUS,
  EXPIRED_LOGIN_STATUS,
};
