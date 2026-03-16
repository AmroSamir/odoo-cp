import appConfig from '@/configs/app.config'
import { COOKIES_KEY } from '@/constants/app.constant'

const COOKIE_NAME = COOKIES_KEY.LOCALE

export async function getLocale() {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(COOKIE_NAME) || appConfig.locale
    }
    return appConfig.locale
}

export async function setLocale(locale: string) {
    if (typeof window !== 'undefined') {
        localStorage.setItem(COOKIE_NAME, locale)
    }
}
