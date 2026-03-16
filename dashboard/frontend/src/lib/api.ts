import axios from 'axios'

const apiPrefix = process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api'

const api = axios.create({
    baseURL: apiPrefix,
    withCredentials: true,
})

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (
            err.response?.status === 401 &&
            typeof window !== 'undefined' &&
            !window.location.pathname.includes('/sign-in')
        ) {
            window.location.href = '/sign-in'
        }
        return Promise.reject(err)
    }
)

export default api
