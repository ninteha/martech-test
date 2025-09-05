// DOM Elements
const elements = {
    email: document.querySelector('#email') as HTMLInputElement,
    password: document.querySelector('#password') as HTMLInputElement,
    modal: document.querySelector('#signUpModal') as HTMLElement,
    modalContent: document.querySelector('.modal-content-section') as HTMLElement,
    thankYouSection: document.querySelector('.modal-section-thank-you') as HTMLElement,
    submitButton: document.querySelector('.modal-content-section-button') as HTMLButtonElement,
    closeButton: document.querySelector('#modalClose') as HTMLElement,
    heroButton: document.querySelector('.hero-button') as HTMLElement,
    emailError: document.querySelector('#emailError') as HTMLElement,
    passwordError: document.querySelector('#passwordError') as HTMLElement,
    emailErrorIcon: document.querySelector('#emailErrorIcon') as HTMLImageElement,
    passwordErrorIcon: document.querySelector('#passwordErrorIcon') as HTMLImageElement,
};

// Constants
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const API_URL = 'https://api.dating.com/identity';
const AUTHORIZED_ZONE = 'https://www.dating.com/people/#token=';

// base64 для работы с токена
const encodeAuthToken = (email: string, password: string) => {
    return btoa(`${email}:${password}`);
};

const redirectToAuthorizedZone = (token: string) => {
    window.location.href = `${AUTHORIZED_ZONE}${token}`;
};

const getToken = (): string | null => {
    return localStorage.getItem('authToken');
};

// Попытка авторизации перед регистрацией
const tryLogin = async (email: string, password: string): Promise<string | null> => {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${encodeAuthToken(email, password)}`,
            },
        });

        if (response.ok) {
            const token = response.headers.get('X-Token');
            return token;
        }
        return null;
    } catch (error) {
        console.error('Login attempt failed:', error);
        return null;
    }
};

const clearErrors = () => {
    elements.emailError.style.display = 'none';
    elements.passwordError.style.display = 'none';
    elements.emailErrorIcon.style.display = 'none';
    elements.passwordErrorIcon.style.display = 'none';
    elements.email.style.borderBottom = '1px solid #3a3a3a50';
    elements.password.style.borderBottom = '1px solid #3a3a3a50';
};

const showError = (field: 'email' | 'password', message: string) => {
    elements[`${field}Error`].textContent = message;
    elements[`${field}Error`].style.display = 'block';
    elements[`${field}`].style.borderBottom = '1px solid #FF0000';
    elements[`${field}ErrorIcon`].style.display = 'block';
};

const resetModal = () => {
    elements.email.value = '';
    elements.password.value = '';
    elements.submitButton.disabled = true;
    clearErrors();
};

const validInputs = () => {
    const emailValid = elements.email.value.trim() !== '';
    const passwordValid =
        elements.password.value.length >= 8 && elements.password.value.length <= 16;
    elements.submitButton.disabled = !(emailValid && passwordValid);
};

// Управление модальным окном
elements.heroButton.addEventListener('click', () => {
    elements.modal.style.display = 'block';
    resetModal();
});

elements.closeButton.addEventListener('click', () => {
    elements.modal.style.display = 'none';
    resetModal();
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && elements.modal.style.display === 'block') {
        elements.modal.style.display = 'none';
        resetModal();
    }
});

// Слушатели для валидации формы
elements.email.addEventListener('input', validInputs);
elements.password.addEventListener('input', validInputs);

validInputs();

// Обработка отправки формы
document.querySelector('#modalForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    const email = elements.email.value.trim();
    const password = elements.password.value;

    clearErrors();

    // Базовая валидация
    if (!email || !password) {
        if (!email) showError('email', 'Please enter an email');
        if (!password) showError('password', 'Please enter a password');
        return;
    }

    if (!EMAIL_REGEX.test(email)) {
        showError('email', 'Please enter a valid email');
        return;
    }

    if (password.length < 8 || password.length > 16) {
        showError('password', 'Password must be 8-16 characters');
        return;
    }

    try {
        // Попытка авторизации перед регистрацией
        const loginToken = await tryLogin(email, password);
        if (loginToken) {
            // Успешная авторизация - сохраняем токен и перенаправляем
            localStorage.setItem('authToken', loginToken);
            elements.modalContent.style.display = 'none';
            elements.thankYouSection.style.display = 'block';
            setTimeout(() => {
                redirectToAuthorizedZone(loginToken);
            }, 3000);
            return;
        }

        // Если авторизация не удалась, то пытаемся зарегистрироваться
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
            }),
        });

        if (response.ok) {
            // Извлечение токена из заголовков
            const token = response.headers.get('X-Token');
            if (token) {
                // Сохранение токена в localStorage
                localStorage.setItem('authToken', token);
                elements.modalContent.style.display = 'none';
                // Показ секции с благодарностью
                elements.thankYouSection.style.display = 'block';
                // Перенаправление через 2 секунды
                setTimeout(() => {
                    redirectToAuthorizedZone(token);
                }, 2000);
            } else {
                showError('email', 'Registration successful but no token received');
            }
        } else if (response.status === 400 || response.status === 409) {
            showError('email', 'This email is already registered');
        } else {
            showError('email', 'An error occurred. Please try again.');
        }
    } catch (err) {
        console.error('Registration failed:', err);
        showError('email', 'Network error. Please check your connection.');
    } finally {
        elements.submitButton.disabled = false;
    }
});

// Автоматическое перенаправление если токен существует
const existingToken = getToken();
if (existingToken) {
    redirectToAuthorizedZone(existingToken);
}
