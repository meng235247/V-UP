// Payment service with placeholder methods
const PaymentService = {
  initiate: (milestoneId, amount, method, message) => {
    // Placeholder for initiating a payment
    console.log('[Payment Initiated]', { milestoneId, amount, method, message });
    return Promise.resolve({ txId: 'mockTxId123', status: 'pending' });
  },

  getStatus: (txId) => {
    // Placeholder for checking payment status
    console.log('[Get Payment Status]', { txId });
    return Promise.resolve({ txId, status: 'success' });
  }
};
