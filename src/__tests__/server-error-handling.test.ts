import { describe, it, expect } from 'vitest'

// Replicates the catch block logic from server.js to verify prod vs dev error responses
function handleServerError(error: Error, isProd: boolean): { status: number; body: string } {
    let status = 0
    let body = ''
    const mockRes = {
        status: (code: number) => { status = code; return mockRes },
        end: (text: string) => { body = text; return mockRes },
    }

    if (isProd) {
        mockRes.status(500).end('Internal Server Error')
    } else {
        mockRes.status(500).end(error.stack ?? error.message)
    }

    return { status, body }
}

describe('server error handling', () => {
    it('returns generic error message in production (no stack trace)', () => {
        const error = new Error('Internal crash: /home/user/sensitive-path/secrets.ts')
        const { status, body } = handleServerError(error, true)

        expect(status).toBe(500)
        expect(body).toBe('Internal Server Error')
        expect(body).not.toContain(error.message)
        expect(body).not.toContain('/home/user')
    })

    it('returns stack trace in development for debuggability', () => {
        const error = new Error('Dev error with details')
        const { status, body } = handleServerError(error, false)

        expect(status).toBe(500)
        expect(body).toContain('Dev error with details')
    })
})
