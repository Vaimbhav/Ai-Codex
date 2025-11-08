export const logDeviceInfo = () => {
    console.log('Device Info:', {
        userAgent: navigator.userAgent,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        platform: navigator.platform,
        windowSize: {
            width: window.innerWidth,
            height: window.innerHeight
        }
    });
};

export const logEventDetails = (eventName: string, event?: Event) => {
    console.log(`${eventName} Event Details:`, {
        type: event?.type,
        isTrusted: event?.isTrusted,
        timeStamp: event?.timeStamp,
        target: event?.target,
        currentTarget: event?.currentTarget,
        preventDefault: typeof event?.preventDefault,
        stopPropagation: typeof event?.stopPropagation
    });
};