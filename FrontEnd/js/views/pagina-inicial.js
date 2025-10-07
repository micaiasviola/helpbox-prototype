const userToggle = document.querySelector('.user-toggle');
const userProfile = document.querySelector('.user-profile');

userToggle.addEventListener('click', () => {
  userProfile.style.display = userProfile.style.display === 'block' ? 'none' : 'block';
});

// Fecha ao clicar fora
document.addEventListener('click', (e) => {
  if (!userProfile.contains(e.target) && !userToggle.contains(e.target)) {
    userProfile.style.display = 'none';
  }
});
