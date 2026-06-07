const dataaccess = require('../dataaccess');

const customerRepo = dataaccess.restaurantCustomerManagement;

/** Find or create customer from booking name/phone and link to booking when missing. */
const syncCustomerFromBooking = async (booking, bookingRepo) => {
  if (!booking || booking.booking_status === 'cancelled') return booking;

  const restaurantId = Number(booking.restaurant_id);
  const name = (booking.customer_name || '').trim();
  const phone = (booking.customer_phone || '').trim();

  if (!name && !phone) return booking;

  if (booking.customer_id) {
    const linked = await customerRepo.findById(booking.customer_id);
    if (linked && Number(linked.restaurant_id) === restaurantId) {
      return booking;
    }
  }

  let customerId = booking.customer_id;

  if (!customerId && phone) {
    const existing = await customerRepo.findByRestaurantAndPhone(
      restaurantId,
      phone
    );
    if (existing) customerId = existing.id;
  }

  if (!customerId) {
    const created = await customerRepo.create({
      restaurant_id: restaurantId,
      customer_name: name || 'Guest',
      phone: phone || null,
      is_not_login: true,
      current_status: 'active',
    });
    customerId = created.id;
  }

  if (Number(booking.customer_id) !== Number(customerId)) {
    await bookingRepo.update(booking.id, { customer_id: customerId });
    return (await bookingRepo.findById(booking.id)) ?? booking;
  }

  return booking;
};

module.exports = { syncCustomerFromBooking };
