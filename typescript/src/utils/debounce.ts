type Callback = ( ...args: any[] ) => void

/**
 * Creates a modified function with a cooldown. If the debounced function is called repeatedly, 
 * it will push out the next execution to `cooldown` ms from now.
 * @param cooldown Time in milliseconds before another call can happen.
 * @param fn Function to debounce.
 * @returns A debounced version of `fn`.
 */
export function debounce<T extends Callback>( cooldown: number, fn: Callback ) {
    let timeoutId: NodeJS.Timeout | null = null

    return function ( ...args: Parameters<T> ) {
        if ( !timeoutId ) {
            fn( ...args )
            timeoutId = setTimeout( () => { timeoutId = null }, cooldown )
        } else {
            clearTimeout( timeoutId )
            timeoutId = setTimeout( () => {
                fn( ...args )
                timeoutId = null
            }, cooldown )
        }
    }
}

/**
 * Like debounce, but will run atleast once every `cooldown` ms while it is being called.
 * Calls are deferred rather than dropped. Pending calls are overwritten if another call comes in before they run.
 * So the last call made is guaranteed to run.
 * @param cooldown Time in milliseconds before another call can happen.
 * @param fn Function to throttle.
 * @returns A throttled version of `fn`.
 */
export default function throttle<T extends Callback>( cooldown: number, fn: Callback ) {
    let deferredCall: any = null
    let blocked = false

    function throttled( ...args: Parameters<T> ) {
        if ( blocked ) {
            deferredCall = { args }
        } else {
            fn( ...args )
            blocked = true
            setTimeout( () => {
                blocked = false
                if ( deferredCall ) {
                    deferredCall = false
                    throttled( ...deferredCall.args )
                }
            }, cooldown )
        }
    }

    return throttled
}
