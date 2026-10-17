# Teachable AI for micro:bit MakeCode

Teachable Machine **image classification** models can be used with a micro:bit MakeCode program.

> Version 0.0.1 is a browser-companion design.  
> TensorFlow.js runs in the computer browser, while the micro:bit receives the prediction over USB serial.

## Why this design?

A normal MakeCode package can add blocks, but it cannot freely inject arbitrary webcam/TensorFlow.js JavaScript into the public micro:bit simulator. MakeCode Editor Extensions also require their hosted URL to be approved by the target. This repository therefore uses a GitHub Pages companion page for the first usable release.

## Blocks

- `AI 모델 주소 [URL] 설정하기`
- `AI 연결 시작하기`
- `AI가 [클래스] 을(를) 인식했을 때` (이벤트)
- `AI 인식 결과`
- `AI 인식 확률` (0–100)
- `AI가 [클래스] 을(를) 인식했는가`
- `AI가 [클래스] 이고 확률이 [80] 이상인가`
- `AI가 연결되어 있는가`

## 1. Upload this repository to GitHub

Create a **public GitHub repository** and upload all files in this ZIP.

Recommended repository name:

`pxt-teachable-ai`

## 2. Enable GitHub Pages

In the repository:

**Settings → Pages → Build and deployment → Deploy from a branch**

Select:

- Branch: `main`
- Folder: `/docs`

After deployment, the companion page will be:

`https://YOUR_GITHUB_ID.github.io/pxt-teachable-ai/`

## 3. Add the MakeCode extension

Open:

https://makecode.microbit.org/

Then:

**Extensions → paste the GitHub repository URL**

Example:

`https://github.com/YOUR_GITHUB_ID/pxt-teachable-ai`

## 4. Create a Teachable Machine image model

Create and publish an image model in Teachable Machine.

Copy the shared model URL, for example:

`https://teachablemachine.withgoogle.com/models/AbCdEf123/`

The browser companion automatically loads:

- `model.json`
- `metadata.json`

## 5. MakeCode example

Use blocks equivalent to:

```text
on start
    AI 연결 시작하기
    AI 모델 주소 "https://teachablemachine.withgoogle.com/models/AbCdEf123/" 설정하기

forever
    if AI가 "화강암" 이고 확률이 80 이상인가
        show string "G"
    else if AI가 "현무암" 이고 확률이 80 % 이상인가
        show string "B"
```

Download the program to the physical micro:bit.

## 6. Run AI in the browser

Open your GitHub Pages companion page using **Chrome or Edge on desktop**.

1. Click **micro:bit 연결**
2. Select the micro:bit serial device
3. Click **카메라 · AI 시작**
4. Allow camera permission
5. The companion asks the micro:bit for the model URL
6. The model loads and predictions are sent back to the micro:bit

## Serial protocol

micro:bit → browser:

`TMURL|https://teachablemachine.withgoogle.com/models/XXXX/`

browser → micro:bit:

`HELLO`

browser → micro:bit:

`TMPRED|class name|0.9731`

The MakeCode block reports confidence as 0–100%.

## Current limitations

- Image models only in v0.0.1.
- Requires a physical micro:bit and a desktop Chromium browser supporting Web Serial.
- The GitHub Pages companion must remain open while inference runs.
- Class names containing `|` are sanitized.
- The micro:bit LED cannot display Korean; use English class names if you show them with `show string`.
- This version does not embed the webcam panel directly inside the MakeCode editor.
- A future officially approved MakeCode Editor Extension could provide tighter editor integration.

## License

MIT
