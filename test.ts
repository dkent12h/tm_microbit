// 예제: 가위바위보 (클래스 이름: rock, paper, scissors)
tm.onConnected(function () {
    basic.showIcon(IconNames.Yes)
})
tm.onLabel("rock", function () {
    basic.showIcon(IconNames.SmallSquare)
})
tm.onLabel("paper", function () {
    basic.showIcon(IconNames.Square)
})
tm.onLabel("scissors", function () {
    basic.showIcon(IconNames.Scissors)
})
tm.setModel("https://teachablemachine.withgoogle.com/models/모델ID/")
tm.setThreshold(70)
basic.forever(function () {
    if (tm.label() == "") {
        basic.clearScreen()
    }
    if (tm.isLabel("rock") && tm.confidenceOf("rock") > 90) {
        music.playTone(262, music.beat(BeatFraction.Eighth))
    }
    basic.pause(100)
})
