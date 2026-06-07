const dataaccess = require('../dataaccess');

const matrixRepo = dataaccess.restaurantLiveTableMatrixMaster;
const tableRepo = dataaccess.restaurantTableMaster;

const STATUS_RANK = { free: 0, reserved: 1, busy: 2 };

const mapBookingStatusToLive = (status) => {
  const s = (status ?? 'available').toLowerCase();
  if (s === 'cancelled' || s === 'completed' || s === 'available' || s === 'free') {
    return 'free';
  }
  if (s === 'pending' || s === 'reserved') return 'reserved';
  if (s === 'confirmed' || s === 'busy' || s === 'occupied' || s === 'booked') {
    return 'busy';
  }
  return 'free';
};

const mapBookingStatusToTableMaster = (status) => {
  const live = mapBookingStatusToLive(status);
  if (live === 'reserved') return 'reserved';
  if (live === 'busy') return 'occupied';
  return 'available';
};

const tableMatchesBooking = (table, { tableId, tableNumber }) => {
  if (tableId) {
    const id = Number(tableId);
    if (Number(table.sourceTableId) === id) return true;
    if (table.id === `master-${id}`) return true;
    if ((table.mergedParts ?? []).some((part) => Number(part.sourceTableId) === id)) {
      return true;
    }
  }
  if (tableNumber != null && String(table.label) === String(tableNumber)) {
    return true;
  }
  return false;
};

const applyStatusToMatrix = (matrix, booking, { bumpVersion = true } = {}) => {
  if (!matrix?.floors?.length) return matrix;
  const { table_id: tableId, table_number: tableNumber, booking_status: bookingStatus } =
    booking;
  if (!tableId && tableNumber == null) return matrix;

  const newStatus = mapBookingStatusToLive(bookingStatus);
  const floors = matrix.floors.map((floor) => ({
    ...floor,
    tables: (floor.tables ?? []).map((table) => {
      if (!tableMatchesBooking(table, { tableId, tableNumber })) return table;
      return { ...table, status: newStatus };
    }),
  }));

  return {
    ...matrix,
    floors,
    version: bumpVersion ? (matrix.version ?? 0) + 1 : matrix.version ?? 0,
  };
};

const overlayBookingsOnMatrix = (matrix, bookings = []) => {
  if (!matrix?.floors?.length) return matrix;

  const floors = matrix.floors.map((floor) => ({
    ...floor,
    tables: (floor.tables ?? []).map((table) => {
      let bestStatus = 'free';
      let bestRank = STATUS_RANK.free;

      for (const booking of bookings) {
        if (
          !tableMatchesBooking(table, {
            tableId: booking.table_id,
            tableNumber: booking.table_number,
          })
        ) {
          continue;
        }

        const mapped = mapBookingStatusToLive(booking.booking_status);
        const rank = STATUS_RANK[mapped] ?? STATUS_RANK.free;
        if (rank >= bestRank) {
          bestRank = rank;
          bestStatus = mapped;
        }
      }

      return { ...table, status: bestStatus };
    }),
  }));

  return { ...matrix, floors };
};

const syncLiveMatrixForBooking = async (restaurantId, tableId, bookingStatus) => {
  if (!restaurantId || !tableId) return;

  const row = await matrixRepo.findByRestaurantId(restaurantId);
  if (row?.matrix) {
    const updated = applyStatusToMatrix(row.matrix, {
      table_id: tableId,
      booking_status: bookingStatus,
    });
    await matrixRepo.upsertByRestaurantId(restaurantId, updated);
  }

  const table = await tableRepo.findById(tableId);
  if (table && Number(table.restaurant_id) === Number(restaurantId)) {
    await tableRepo.update(tableId, {
      booking_status: mapBookingStatusToTableMaster(bookingStatus),
    });
  }
};

const syncTableMastersFromBookings = async (restaurantId, bookings = []) => {
  const seen = new Set();
  for (const booking of bookings) {
    const tableId = booking.table_id;
    if (!tableId || seen.has(tableId)) continue;
    seen.add(tableId);
    const table = await tableRepo.findById(tableId);
    if (table && Number(table.restaurant_id) === Number(restaurantId)) {
      await tableRepo.update(tableId, {
        booking_status: mapBookingStatusToTableMaster(booking.booking_status),
      });
    }
  }
};

const matrixStatusesMatch = (left, right) =>
  JSON.stringify(left?.floors ?? []) === JSON.stringify(right?.floors ?? []);

const reconcileMatrixWithBookings = async (restaurantId, { persist = true } = {}) => {
  const row = await matrixRepo.findByRestaurantId(restaurantId);
  if (!row?.matrix) return row;

  const bookingRepo = dataaccess.restaurantBookingMaster;
  const bookings = await bookingRepo.listActiveByRestaurantId(restaurantId);
  const overlay = overlayBookingsOnMatrix(row.matrix, bookings);

  if (persist && !matrixStatusesMatch(row.matrix, overlay)) {
    await matrixRepo.upsertByRestaurantId(restaurantId, overlay);
    await syncTableMastersFromBookings(restaurantId, bookings);
  }

  return { ...row, matrix: overlay };
};

module.exports = {
  mapBookingStatusToLive,
  overlayBookingsOnMatrix,
  reconcileMatrixWithBookings,
  syncLiveMatrixForBooking,
};
