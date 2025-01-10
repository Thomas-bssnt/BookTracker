document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.querySelector('#menuButton');
    const navigation = document.querySelector('nav');
    const mainContent = document.querySelector('main');

    menuButton.addEventListener('click', function () {
        navigation.classList.toggle('open');
        mainContent.classList.toggle('shifted');
    });
});
