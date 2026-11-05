/**
 * Teachable AI for micro:bit (Bluetooth version, micro:bit V2)
 *
 * The browser companion (docs/index.html) runs the Teachable Machine model
 * and sends each prediction over the Bluetooth UART service.
 * USB can stay connected to MakeCode the whole time.
 *
 *  browser -> micro:bit : HELLO
 *  micro:bit -> browser : TMURL|https://teachablemachine.withgoogle.com/models/XXXX/
 *  browser -> micro:bit : TMPRED|class name|0.9731
 *
 * Every message ends with a newline.
 */

//% color="#7C4DFF" icon="" block="Teachable AI"
//% groups='["설정", "인식 결과", "연결"]'
namespace TeachableAI {
    let modelUrl = ""
    let lastLabel = ""
    let lastConfidence = 0
    let started = false
    let btConnected = false
    let lastMessageTime = -100000
    let handlerLabels: string[] = []
    let handlers: (() => void)[] = []

    function cleanUrl(url: string): string {
        url = url.trim()
        if (url.length == 0) return ""
        if (url.charAt(url.length - 1) != "/") url = url + "/"
        return url
    }

    // BLE packets are short, so the URL is written in small pieces.
    // The browser joins them again at the newline.
    function sendModelUrl(): void {
        if (modelUrl.length == 0 || !btConnected) return
        const text = "TMURL|" + modelUrl
        let i = 0
        while (i < text.length) {
            bluetooth.uartWriteString(text.substr(i, 16))
            i += 16
            basic.pause(30)
        }
        bluetooth.uartWriteString("\n")
    }

    function processLine(line: string): void {
        if (!line) return
        line = line.trim()

        if (line == "HELLO") {
            lastMessageTime = input.runningTime()
            sendModelUrl()
            return
        }

        if (line.indexOf("TMPRED|") == 0) {
            const rest = line.substr(7)
            let sep = -1
            for (let k = rest.length - 1; k >= 0; k--) {
                if (rest.charAt(k) == "|") {
                    sep = k
                    break
                }
            }
            if (sep < 0) return
            const label = rest.substr(0, sep)
            const p = parseFloat(rest.substr(sep + 1))
            if (!isNaN(p)) {
                lastConfidence = Math.round(p * 1000) / 10
            }
            lastMessageTime = input.runningTime()
            if (label != lastLabel) {
                lastLabel = label
                for (let i = 0; i < handlerLabels.length; i++) {
                    if (handlerLabels[i] == label) control.runInParallel(handlers[i])
                }
            }
        }
    }

    function ensureStarted(): void {
        if (started) return
        started = true

        bluetooth.onBluetoothConnected(function () {
            btConnected = true
            lastMessageTime = input.runningTime()
        })
        bluetooth.onBluetoothDisconnected(function () {
            btConnected = false
            lastMessageTime = -100000
        })
        bluetooth.startUartService()
        bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            processLine(bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine)))
        })
    }

    /**
     * Set the Teachable Machine model URL.
     * Paste the share URL ending in /models/XXXX/.
     */
    //% block="AI 모델 주소 %url 설정하기"
    //% url.shadow="text"
    //% url.defl="https://teachablemachine.withgoogle.com/models/XXXX/"
    //% group="설정"
    //% weight=100
    export function setModelUrl(url: string): void {
        ensureStarted()
        modelUrl = cleanUrl(url)
        sendModelUrl()
    }

    /**
     * Start Bluetooth communication with the browser companion.
     */
    //% block="AI 연결 시작하기"
    //% group="연결"
    //% weight=90
    export function start(): void {
        ensureStarted()
        sendModelUrl()
    }

    /**
     * Run when the recognized class changes to the given label.
     */
    //% block="AI가 %label 을(를) 인식했을 때"
    //% label.defl="Class 1"
    //% group="인식 결과"
    //% weight=85
    export function onRecognized(label: string, handler: () => void): void {
        ensureStarted()
        handlerLabels.push(label)
        handlers.push(handler)
    }

    /**
     * Get the latest predicted class label.
     */
    //% block="AI 인식 결과"
    //% group="인식 결과"
    //% weight=80
    export function result(): string {
        ensureStarted()
        return lastLabel
    }

    /**
     * Confidence of the latest prediction, 0-100 percent.
     */
    //% block="AI 인식 확률"
    //% group="인식 결과"
    //% weight=70
    export function confidence(): number {
        ensureStarted()
        return lastConfidence
    }

    /**
     * Check whether the latest prediction is a given class.
     */
    //% block="AI가 %label 을(를) 인식했는가"
    //% label.shadow="text"
    //% label.defl="Class 1"
    //% group="인식 결과"
    //% weight=60
    export function isLabel(label: string): boolean {
        ensureStarted()
        return lastLabel == label
    }

    /**
     * Check whether the latest prediction is a given class
     * and its confidence (0-100) is at least the threshold.
     */
    //% block="AI가 %label 이고 확률이 %threshold 이상인가"
    //% label.shadow="text"
    //% label.defl="Class 1"
    //% threshold.min=0 threshold.max=100 threshold.defl=80
    //% group="인식 결과"
    //% weight=50
    export function isLabelWithConfidence(label: string, threshold: number): boolean {
        ensureStarted()
        return lastLabel == label && lastConfidence >= threshold
    }

    /**
     * True if the companion page is connected over Bluetooth
     * and a message arrived in the last 5 seconds.
     */
    //% block="AI가 연결되어 있는가"
    //% group="연결"
    //% weight=40
    export function connected(): boolean {
        ensureStarted()
        return btConnected && input.runningTime() - lastMessageTime < 5000
    }

    /**
     * Return the configured model URL.
     */
    //% block="설정된 AI 모델 주소"
    //% group="설정"
    //% advanced=true
    export function getModelUrl(): string {
        return modelUrl
    }
}
