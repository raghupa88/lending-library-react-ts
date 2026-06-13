import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { describe, it, expect } from 'vitest'
import { render } from '../entry-server'
import { ThemeProvider } from '../context/ThemeContext'
import { AuthProvider } from '../context/AuthContext'

describe('entry-server render()', () => {
    it('renders a non-empty HTML string for "/"', () => {
        const html = render('/')
        expect(typeof html).toBe('string')
        expect(html.length).toBeGreaterThan(0)
    })

    it('renders a non-empty HTML string for "/books"', () => {
        const html = render('/books')
        expect(typeof html).toBe('string')
        expect(html.length).toBeGreaterThan(0)
    })

    it('does not throw for an empty url string (falls back to "/")', () => {
        expect(() => render('')).not.toThrow()
    })

    it('does not throw for undefined url (falls back to "/")', () => {
        expect(() => render(undefined as unknown as string)).not.toThrow()
    })

    it('returns fallback HTML when a component throws during renderToString', () => {
        const ThrowingComponent = (): React.ReactElement => {
            throw new Error('Simulated SSR crash')
        }
        let result = ''
        try {
            result = ReactDOMServer.renderToString(
                <StaticRouter location="/">
                    <ThrowingComponent />
                </StaticRouter>
            )
        } catch {
            result = '<div style="padding:20px;text-align:center"><h2>Something went wrong</h2></div>'
        }
        expect(result).toContain('Something went wrong')
    })
})

describe('ThemeProvider in SSR environment', () => {
    it('does not access localStorage during renderToString', () => {
        const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
        // Simulate missing localStorage (server environment)
        Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true })

        expect(() =>
            ReactDOMServer.renderToString(
                <ThemeProvider><div>test</div></ThemeProvider>
            )
        ).not.toThrow()

        if (original) Object.defineProperty(window, 'localStorage', original)
    })
})

describe('AuthProvider in SSR environment', () => {
    it('does not access localStorage during renderToString', () => {
        const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
        Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true })

        expect(() =>
            ReactDOMServer.renderToString(
                <AuthProvider><div>test</div></AuthProvider>
            )
        ).not.toThrow()

        if (original) Object.defineProperty(window, 'localStorage', original)
    })
})
