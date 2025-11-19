import localFont from 'next/font/local'

// Шрифт ДУРИК
export const durikFont = localFont({
  src: [
    {
      path: './ДУРИК.otf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-durik',
  display: 'swap',
  preload: true,
})

// Шрифт Blauer Nue с полным набором весов
export const blauerNueFont = localFont({
  src: [
    {
      path: './Blauer-Nue-Thin-iF6626350c96c3e.otf',
      weight: '100',
      style: 'normal',
    },
    {
      path: './Blauer-Nue-Thin-Italic-iF6626350c9204d.otf',
      weight: '100',
      style: 'italic',
    },
    {
      path: './Blauer-Nue-Extralight-iF6626350c56af4.otf',
      weight: '200',
      style: 'normal',
    },
    {
      path: './Blauer-Nue-Extralight-Italic-iF6626350c51a9c.otf',
      weight: '200',
      style: 'italic',
    },
    {
      path: './Blauer-Nue-Light-iF6626350c6db36.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './Blauer-Nue-Light-Italic-iF6626350c68fe5.otf',
      weight: '300',
      style: 'italic',
    },
    {
      path: './Blauer-Nue-Regular-iF6626350c83fdf.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './Blauer-Nue-Regular-Italic-iF6626350c7f4f6.otf',
      weight: '400',
      style: 'italic',
    },
    {
      path: './Blauer-Nue-Medium-iF6626350c78103.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './Blauer-Nue-Medium-Italic-iF6626350c725e0.otf',
      weight: '500',
      style: 'italic',
    },
    {
      path: './Blauer-Nue-Semibold-iF6626350c8d55c.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './Blauer-Nue-Semibold-Italic-iF6626350c889ba.otf',
      weight: '600',
      style: 'italic',
    },
    {
      path: './Blauer-Nue-Bold-Italic-iF6626350c420cc.otf',
      weight: '700',
      style: 'italic',
    },
    {
      path: './Blauer-Nue-Extrabold-iF6626350c4c856.otf',
      weight: '800',
      style: 'normal',
    },
    {
      path: './Blauer-Nue-Extrabold-Italic-iF6626350c47867.otf',
      weight: '800',
      style: 'italic',
    },
    {
      path: './Blauer-Nue-Heavy-iF6626350c62afa.otf',
      weight: '900',
      style: 'normal',
    },
    {
      path: './Blauer-Nue-Heavy-Italic-iF6626350c5cbff.otf',
      weight: '900',
      style: 'italic',
    },
  ],
  variable: '--font-blauer-nue',
  display: 'swap',
  preload: true,
})

// Шрифт CabinetGrotesk с разными весами
export const cabinetGroteskFont = localFont({
  src: [
    {
      path: './CabinetGrotesk-Thin.otf',
      weight: '100',
      style: 'normal',
    },
    {
      path: './CabinetGrotesk-Extralight.otf',
      weight: '200',
      style: 'normal',
    },
    {
      path: './CabinetGrotesk-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './CabinetGrotesk-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './CabinetGrotesk-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './CabinetGrotesk-Bold.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './CabinetGrotesk-Extrabold.otf',
      weight: '800',
      style: 'normal',
    },
    {
      path: './CabinetGrotesk-Black.otf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-cabinet-grotesk',
  display: 'swap',
  preload: true,
})
