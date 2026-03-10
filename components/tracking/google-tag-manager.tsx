"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { usePathname } from "next/navigation"

declare global {
    interface Window {
        gtmLoaded?: boolean
        dataLayer?: Record<string, unknown>[]
    }
}

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

const EXCLUDED_PATHS = ["/store", "/platform", "/site"]

const MAIN_DOMAINS = [
    "localhost",
    "127.0.0.1",
    "groware.io",
    "www.groware.io",
]

function shouldExcludeGTM(pathname: string): boolean {
    return EXCLUDED_PATHS.some((path) => pathname.startsWith(path))
}

function isClientSite(): boolean {
    if (typeof window === "undefined") return false

    const hostname = window.location.hostname.toLowerCase()

    return !MAIN_DOMAINS.includes(hostname)
}

export function GoogleTagManager() {
    const pathname = usePathname()
    const loadedRef = useRef(false)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(isClientSite())
    }, [])

    const loadGTM = useCallback(() => {
        if (!GTM_ID) return
        if (loadedRef.current) return
        if (window.gtmLoaded) return
        if (isClientSite()) return

        loadedRef.current = true
        window.gtmLoaded = true

        window.dataLayer = window.dataLayer || []
        window.dataLayer.push({
            "gtm.start": new Date().getTime(),
            event: "gtm.js",
        })

        const script = document.createElement("script")
        script.async = true
        script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`
        document.head.appendChild(script)
    }, [])

    useEffect(() => {
        if (!GTM_ID || shouldExcludeGTM(pathname) || isClient) return

        if (typeof document === "undefined") return
        if ((document as unknown as { contentType?: string }).contentType &&
            !(document as unknown as { contentType: string }).contentType.includes("html")) {
            return
        }

        const triggerEvents = ["scroll", "mousemove", "touchstart", "click", "keydown"]

        triggerEvents.forEach((evt) =>
            window.addEventListener(evt, loadGTM, { once: true, passive: true })
        )

        const timeout = setTimeout(loadGTM, 5000)

        return () => {
            triggerEvents.forEach((evt) => window.removeEventListener(evt, loadGTM))
            clearTimeout(timeout)
        }
    }, [pathname, loadGTM, isClient])

    if (!GTM_ID || shouldExcludeGTM(pathname) || isClient) {
        return null
    }

    return null
}

export function GoogleTagManagerNoScript() {
    const pathname = usePathname()
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(isClientSite())
    }, [])

    if (!GTM_ID || shouldExcludeGTM(pathname) || isClient) {
        return null
    }

    return (
        <noscript>
            <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
            />
        </noscript>
    )
}
