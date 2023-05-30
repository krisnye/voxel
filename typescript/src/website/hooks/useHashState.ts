import { useEffect, useState } from "preact/hooks"

function getHash() {
    return location.hash ? location.hash.slice( 1 ) : undefined
}

export default function useHashState( initialValue?: string ) {
    const currentHash = getHash()
    const [ state, setState ] = useState( currentHash ?? initialValue )
    if ( !currentHash && initialValue )
        location.hash = initialValue

    useEffect( () => {
        function onHashChange() { setState( getHash() ) }
        window.addEventListener( "hashchange", onHashChange )
        return () => window.removeEventListener( "hashchange", onHashChange )
    }, [] )

    function _setState( value: string ) {
        location.hash = value
    }

    return [ state, _setState ] as [ string, typeof _setState ]
}