/**
 * Teachable AI for micro:bit
 * Teachable Machine image classification bridge for MakeCode.
 *
 * The browser companion (docs/index.html) runs TensorFlow.js / Teachable Machine.
 * micro:bit communicates with the companion over USB serial (115200).
 *
 *  browser → micro:bit : HELLO
 *  micro:bit → browser : TMURL|https://teachablemachine.withgoogle.com/models/XXXX/
 *  browser → micro:bit : TMPRED|class name|0.9731
 */

//% color="#7C4DFF" icon="" block="Teachable AI"
//% groups='["설정", "인식 결과", "연결"]'
namespace TeachableAI {
    let modelUrl = ""
    let lastLabel = ""
    let lastConfidence = 0
    let serialStarted = false
    let lastMessageTime = -100000
    let handlerLabels: string[] = []
    let handlers: (() => void)[] = []

    function cleanUrl(url: string): string {
        url = url.trim()
        if (url.length == 0) return ""
        if (url.charAt(url.length - 1) != "/") url = url + "/"
        return url
    }

    function sendModelUrl(): void {
        if (modelUrl.length > 0) {
            serial.writeLine("TMURL|" + modelUrl)
        }
    }

    function processLine(line: string): void {
        if (!line) return
        line = line.trim()

        // Companion asks for the model URL after Web Serial connects.
        if (line == "HELLO") {
            lastMessageTime = input.runningTime()
            sendModelUrl()
            return
        }

        // Prediction format: TMPRED|label|probability(0..1)
        if (line.indexOf("TMPRED|") == 0) {
            let rest = line.substr(7)
            let sep = -1
            for (let k = rest.length - 1; k >= 0; k--) {
                if (rest.charAt(k) == "|") {
                    sep = k
                    break
                }
            }
            if (sep < 0) return
            let label = rest.substr(0, sep)
            let p = parseFloat(rest.substr(sep + 1))
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

    function ensureSerialReader(): void {
        if (serialStarted) return
        serialStarted = true

        serial.redirectToUSB()
        serial.setBaudRate(BaudRate.BaudRate115200)

        control.inBackground(function () {
            while (true) {
                let line = serial.readUntil(serial.delimiters(Delimiters.NewLine))
                processLine(line)
                basic.pause(1)
            }
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
        ensureSerialReader()
        modelUrl = cleanUrl(url)
        sendModelUrl()
    }

    /**
     * Start USB serial communication with the browser companion.
     */
    //% block="AI 연결 시작하기"
    //% group="연결"
    //% weight=90
    export function start(): void {
        ensureSerialReader()
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
        ensureSerialReader()
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
        ensureSerialReader()
        return lastLabel
    }

    /**
     * Confidence of the latest prediction, 0-100 percent.
     */
    //% block="AI 인식 확률"
    //% group="인식 결과"
    //% weight=70
    export function confidence(): number {
        ensureSerialReader()
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
        ensureSerialReader()
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
        ensureSerialReader()
        return lastLabel == label && lastConfidence >= threshold
    }

    /**
     * True if a serial message was received in the last 5 seconds.
     */
    //% block="AI가 연결되어 있는가"
    //% group="연결"
    //% weight=40
    export function connected(): boolean {
        ensureSerialReader()
        return input.runningTime() - lastMessageTime < 5000
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
