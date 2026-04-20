// Updated FanProfilePage to integrate Firebase Auth
const FanProfilePage = {
  init: () => {
    AuthService.onAuthStateChanged(user => {
      if (user) {
        document.getElementById('fan-name').textContent = user.displayName;
        document.getElementById('fan-avatar').src = user.photoURL;
      } else {
        alert('請先登入！');
        window.location.href = 'auth.html';
      }
    });
  }
};

// Initialize the fan profile page
FanProfilePage.init();
