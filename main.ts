/**
 * 티처블머신(Teachable Machine) 확장 블록
 * 카메라와 모델 추론은 웹앱이 하고, 마이크로비트는 USB 시리얼로 결과를 받습니다.
 *
 * 통신 규칙 (한 줄씩, 줄바꿈으로 끝남)
 *  웹앱 → 마이크로비트
 *    H                         연결 확인
 *    L|rock,paper,scissors     모델의 클래스 목록
 *    R|0|rock|92|92,5,3        결과: 번호|이름|신뢰도|전체 클래스 신뢰도
 *  마이크로비트 → 웹앱
 *    M|모델ID                  모델 주소(ID) 알림
 *    S / P                     분류 시작 / 멈춤
 */

class TmLabelHandler {
    label: string
    handler: () => void
    busy: boolean
    constructor(label: string, handler: () => void) {
        this.label = label
        this.handler = handler
        this.busy = false
    }
}

//% color="#7B4FBF" icon="" weight=95 block="티처블머신"
//% groups=['모델', '결과', '설정']
namespace tm {
    let _inited = false
    let _modelId = ""
    let _running = true
    let _connected = false
    let _threshold = 0
    let _label = ""
    let _index = -1
    let _conf = 0
    let _labels: string[] = []
    let _confs: number[] = []
    let _handlers: TmLabelHandler[] = []
    let _onConnected: () => void = null

    function init(): void {
        if (_inited) return
        _inited = true
        serial.setRxBufferSize(128)
        serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            handleLine(serial.readUntil(serial.delimiters(Delimiters.NewLine)))
        })
    }

    function cleanLine(line: string): string {
        let s = line
        while (s.length > 0 && (s.charAt(s.length - 1) == "\r" || s.charAt(s.length - 1) == " ")) {
            s = s.substr(0, s.length - 1)
        }
        return s
    }

    function parseModelId(url: string): string {
        let s = url
        const key = "models/"
        const k = s.indexOf(key)
        if (k >= 0) s = s.substr(k + key.length)
        const slash = s.indexOf("/")
        if (slash >= 0) s = s.substr(0, slash)
        return s
    }

    function sendState(): void {
        serial.writeLine("M|" + _modelId)
        serial.writeLine(_running ? "S" : "P")
    }

    function fire(label: string): void {
        for (const h of _handlers) {
            if (h.label == label && !h.busy) {
                h.busy = true
                control.runInParallel(function () {
                    h.handler()
                    h.busy = false
                })
            }
        }
    }

    function handleLine(raw: string): void {
        const line = cleanLine(raw)
        if (line.length == 0) return
        const kind = line.charAt(0)

        if (kind == "H") {
            sendState()
            if (!_connected) {
                _connected = true
                if (_onConnected) control.runInParallel(_onConnected)
            }
            return
        }

        const parts = line.split("|")

        if (kind == "L") {
            _labels = (parts.length > 1 && parts[1].length > 0) ? parts[1].split(",") : []
            return
        }

        if (kind == "R" && parts.length >= 4) {
            if (!_running) return
            const idx = parseInt(parts[1])
            const lab = parts[2]
            const c = parseInt(parts[3])
            if (parts.length >= 5 && parts[4].length > 0) {
                const list = parts[4].split(",")
                _confs = []
                for (const v of list) _confs.push(parseInt(v))
            }
            _conf = c
            let newLabel = lab
            let newIdx = idx
            if (c < _threshold) {
                newLabel = ""
                newIdx = -1
            }
            const changed = newLabel != _label
            _label = newLabel
            _index = newIdx
            if (changed && newLabel.length > 0) fire(newLabel)
        }
    }

    /**
     * 티처블머신에서 '업로드' 후 받은 공유 링크를 넣습니다. 시작하면 블록 안에 넣으세요.
     * @param url 티처블머신 모델 공유 링크
     */
    //% block="티처블머신 모델 주소 $url 로 정하기"
    //% url.defl="https://teachablemachine.withgoogle.com/models/모델ID/"
    //% group="모델" weight=100
    export function setModel(url: string): void {
        init()
        _modelId = parseModelId(url)
        serial.writeLine("M|" + _modelId)
    }

    /**
     * 분류 결과를 받기 시작합니다. (처음에는 시작된 상태입니다)
     */
    //% block="분류 시작하기"
    //% group="모델" weight=90
    export function start(): void {
        init()
        _running = true
        serial.writeLine("S")
    }

    /**
     * 분류 결과 받기를 멈춥니다.
     */
    //% block="분류 멈추기"
    //% group="모델" weight=85
    export function stop(): void {
        init()
        _running = false
        _label = ""
        _index = -1
        _conf = 0
        serial.writeLine("P")
    }

    /**
     * 분류 결과가 이 클래스로 바뀌었을 때 실행합니다.
     * @param label 티처블머신 클래스 이름 (대소문자까지 똑같이)
     */
    //% block="분류 결과가 $label 일 때"
    //% label.defl="A"
    //% group="결과" weight=80
    export function onLabel(label: string, handler: () => void): void {
        init()
        _handlers.push(new TmLabelHandler(label, handler))
    }

    /**
     * 지금의 분류 결과(클래스 이름). 결과가 없으면 빈 글자입니다.
     */
    //% block="분류 결과"
    //% group="결과" weight=75
    export function label(): string {
        init()
        return _label
    }

    /**
     * 분류 결과가 이 클래스인지 확인합니다.
     */
    //% block="분류 결과가 $name 인가?"
    //% name.defl="A"
    //% group="결과" weight=70
    export function isLabel(name: string): boolean {
        init()
        return _label.length > 0 && _label == name
    }

    /**
     * 분류 결과의 신뢰도(0~100)
     */
    //% block="분류 결과의 신뢰도"
    //% group="결과" weight=65
    export function confidence(): number {
        init()
        return _conf
    }

    /**
     * 클래스 하나의 신뢰도(0~100)
     */
    //% block="$name 의 신뢰도"
    //% name.defl="A"
    //% group="결과" weight=60
    export function confidenceOf(name: string): number {
        init()
        const i = _labels.indexOf(name)
        if (i >= 0 && i < _confs.length) return _confs[i]
        if (name == _label) return _conf
        return 0
    }

    /**
     * 분류 결과의 번호. 첫 번째 클래스가 0입니다. 결과가 없으면 -1입니다.
     */
    //% block="분류 결과 번호"
    //% group="결과" weight=55
    export function labelIndex(): number {
        init()
        return _index
    }

    /**
     * 신뢰도가 이 값보다 낮으면 결과를 무시합니다.
     * @param percent 0~100
     */
    //% block="신뢰도 기준을 $percent 으로 정하기"
    //% percent.min=0 percent.max=100 percent.defl=70
    //% group="설정" weight=50
    export function setThreshold(percent: number): void {
        init()
        _threshold = Math.max(0, Math.min(100, percent))
    }

    /**
     * 웹앱과 연결되었을 때 실행합니다.
     */
    //% block="웹앱과 연결되었을 때"
    //% group="설정" weight=45
    export function onConnected(handler: () => void): void {
        init()
        _onConnected = handler
    }

    /**
     * 웹앱과 연결되었는지 확인합니다.
     */
    //% block="웹앱과 연결되었는가?"
    //% group="설정" weight=40
    export function isConnected(): boolean {
        init()
        return _connected
    }
}
