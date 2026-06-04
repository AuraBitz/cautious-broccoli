const dataaccess = require('../dataaccess');

const EXPIRED_PLAN_STATUS = 'Deactivate';
const ACTIVE_PLAN_STATUS = 'Active';
const EXPIRED_LOGIN_STATUS = 'inactive';
const ACTIVE_LOGIN_STATUS = 'active';

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

const buildTrackerMap = (trackers) =>
  trackers.reduce((map, row) => {
    map[row.client_login_id] = row;
    return map;
  }, {});

const resolvePlanStartAt = (client, trackerMap) => {
  if (client?.login_id && trackerMap[client.login_id]?.purchase_at) {
    return trackerMap[client.login_id].purchase_at;
  }
  return client?.plan_start_at ?? null;
};

const resolvePlanId = (client, trackerMap) => {
  if (client?.login_id && trackerMap[client.login_id]?.plan_id) {
    return trackerMap[client.login_id].plan_id;
  }
  return client?.plan_id ?? null;
};

const applyPlanSync = async (client, planMap, trackerMap = {}) => {
  const planId = resolvePlanId(client, trackerMap);
  const planStartAt = resolvePlanStartAt(client, trackerMap);

  if (!planStartAt || !planId) {
    return client;
  }

  const plan = planMap[planId];
  if (!plan) {
    return client;
  }

  const remainDays = computeRemainDays(planStartAt, plan.plan_valid_days);
  const isExpired = remainDays === 0;

  if (isExpired) {
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
        plan_id: planId,
        plan_start_at: planStartAt,
        plan_remain_days: 0,
        plan_status: EXPIRED_PLAN_STATUS,
      }
    );
  }

  const needsUpdate =
    client.plan_remain_days !== remainDays ||
    client.plan_status === EXPIRED_PLAN_STATUS ||
    client.plan_id !== planId;

  if (needsUpdate) {
    const updatedClient = await dataaccess.clientManagement.update(client.id, {
      plan_id: planId,
      plan_start_at: planStartAt,
      plan_remain_days: remainDays,
      plan_status: ACTIVE_PLAN_STATUS,
    });

    if (client.login_id) {
      await dataaccess.clientLoginMaster.updateStatus(
        client.login_id,
        ACTIVE_LOGIN_STATUS
      );
    }

    return (
      updatedClient || {
        ...client,
        plan_id: planId,
        plan_start_at: planStartAt,
        plan_remain_days: remainDays,
        plan_status: ACTIVE_PLAN_STATUS,
      }
    );
  }

  return {
    ...client,
    plan_id: planId,
    plan_start_at: planStartAt,
    plan_remain_days: remainDays,
  };
};

const recordPlanPurchase = async ({
  clientLoginId,
  planId,
  purchaseAt = new Date(),
}) => {
  const loginExists = await dataaccess.clientLoginMaster.existsById(
    clientLoginId
  );
  if (!loginExists) {
    const { AppError } = require('../utils');
    throw new AppError('client_login_id not found', 400, 'INVALID_LOGIN_ID');
  }

  const plan = await dataaccess.plansMaster.findById(planId);
  if (!plan) {
    const { AppError } = require('../utils');
    throw new AppError('plan_id not found', 400, 'INVALID_PLAN_ID');
  }

  const client = await dataaccess.clientManagement.findByLoginId(clientLoginId);
  if (!client) {
    const { AppError } = require('../utils');
    throw new AppError(
      'No client linked to this login',
      400,
      'CLIENT_NOT_FOUND'
    );
  }

  const purchaseIso =
    purchaseAt instanceof Date ? purchaseAt.toISOString() : purchaseAt;

  const tracker = await dataaccess.plansTracker.create({
    client_login_id: clientLoginId,
    plan_id: planId,
    purchase_at: purchaseIso,
  });

  const remainDays = computeRemainDays(purchaseIso, plan.plan_valid_days);
  const isExpired = remainDays === 0;

  const updatedClient = await dataaccess.clientManagement.update(client.id, {
    plan_id: planId,
    plan_start_at: purchaseIso,
    plan_remain_days: remainDays,
    plan_status: isExpired ? EXPIRED_PLAN_STATUS : ACTIVE_PLAN_STATUS,
    applied_at: purchaseIso,
  });

  await dataaccess.clientLoginMaster.updateStatus(
    clientLoginId,
    isExpired ? EXPIRED_LOGIN_STATUS : ACTIVE_LOGIN_STATUS
  );

  return {
    tracker,
    client: updatedClient,
    plan_remain_days: remainDays,
    plan_status: isExpired ? EXPIRED_PLAN_STATUS : ACTIVE_PLAN_STATUS,
  };
};

const syncClientPlan = async (client) => {
  if (!client) return client;

  const trackerMap = {};
  if (client.login_id) {
    const latest = await dataaccess.plansTracker.findLatestByLoginId(
      client.login_id
    );
    if (latest) trackerMap[client.login_id] = latest;
  }

  const planId = resolvePlanId(client, trackerMap);
  if (!planId) return client;

  const plan = await dataaccess.plansMaster.findById(planId);
  const planMap = plan ? buildPlanMap([plan]) : {};
  return applyPlanSync(client, planMap, trackerMap);
};

const syncClientsPlan = async (clients) => {
  if (!clients?.length) return clients;

  const loginIds = [
    ...new Set(clients.map((c) => c.login_id).filter(Boolean)),
  ];

  const trackers = await dataaccess.plansTracker.findLatestByLoginIds(
    loginIds
  );
  const trackerMap = buildTrackerMap(trackers);

  const planIds = [
    ...new Set(
      clients
        .map((c) => resolvePlanId(c, trackerMap))
        .filter((id) => id != null)
    ),
  ];

  const plans = await dataaccess.plansMaster.findByIds(planIds);
  const planMap = buildPlanMap(plans);

  return Promise.all(
    clients.map((client) => applyPlanSync(client, planMap, trackerMap))
  );
};

const preparePlanOnSave = async (payload) => {
  if (!payload.plan_id) {
    return payload;
  }

  const plan = await dataaccess.plansMaster.findById(payload.plan_id);
  if (!plan) {
    return payload;
  }

  const planStartAt = payload.plan_start_at;
  if (!planStartAt) {
    return payload;
  }

  const remainDays = computeRemainDays(planStartAt, plan.plan_valid_days);
  const isExpired = remainDays === 0;

  return {
    ...payload,
    plan_remain_days: remainDays,
    plan_status: isExpired
      ? EXPIRED_PLAN_STATUS
      : payload.plan_status || ACTIVE_PLAN_STATUS,
  };
};

const deactivateLoginIfExpired = async (loginId, isExpired) => {
  if (!loginId || !isExpired) return;
  await dataaccess.clientLoginMaster.updateStatus(
    loginId,
    EXPIRED_LOGIN_STATUS
  );
};

const activateLoginIfActive = async (loginId, isActive) => {
  if (!loginId || !isActive) return;
  await dataaccess.clientLoginMaster.updateStatus(
    loginId,
    ACTIVE_LOGIN_STATUS
  );
};

module.exports = {
  computeRemainDays,
  recordPlanPurchase,
  syncClientPlan,
  syncClientsPlan,
  preparePlanOnSave,
  deactivateLoginIfExpired,
  activateLoginIfActive,
  EXPIRED_PLAN_STATUS,
  ACTIVE_PLAN_STATUS,
  EXPIRED_LOGIN_STATUS,
  ACTIVE_LOGIN_STATUS,
};
