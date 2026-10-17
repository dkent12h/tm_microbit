TeachableAI.setModelUrl("https://teachablemachine.withgoogle.com/models/XXXX/")

TeachableAI.onRecognized("Class 1", function () {
    basic.showIcon(IconNames.Yes)
})
TeachableAI.onRecognized("Class 2", function () {
    basic.showIcon(IconNames.No)
})

basic.forever(function () {
    if (TeachableAI.isLabelWithConfidence("Class 1", 80)) {
        pins.digitalWritePin(DigitalPin.P0, 1)
    } else {
        pins.digitalWritePin(DigitalPin.P0, 0)
    }
    basic.pause(100)
})
