ALTER TABLE restaurant_customer_transaction_master
  RENAME TO restaurant_transaction_master;

ALTER INDEX IF EXISTS idx_restaurant_customer_txn_customer
  RENAME TO idx_restaurant_transaction_customer;
