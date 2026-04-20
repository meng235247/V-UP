// Dashboard page controller placeholder
const DashboardPage = {
  init: () => {
    AuthService.onAuthStateChanged(user => {
      if (!user) {
        alert('請先登入！');
        window.location.href = 'auth.html';
      } else {
        console.log(`歡迎，${user.displayName}`);
      }
    });
  }
};

// Initialize the dashboard page
DashboardPage.init();
