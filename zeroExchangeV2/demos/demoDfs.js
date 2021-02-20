// DFS
const pools = require('../tools/adder/new/pools.json')
const tokens = require('../tools/adder/new/tokens.json')


function dfsFindPaths(pairs, tokenIn, tokenOut, maxHops, currentPairs, path, circles) {
    pairs = pairs || pools
    tokenIn = tokenIn || 'T0000' 
    tokenOut = 'T0000' 
    maxHops = maxHops || 6
    circles = circles || []
    currentPairs = currentPairs || []
    path = path || []
    for (let i=0; i<pairs.length; i++) {
        let newPath = path.length>0 ? [...path] : [tokenIn]
        let tempOut
        let pair = pairs[i]
        let pairTkns = pair.tkns.map(t=>t.id)
        if (tokenIn!=pairTkns[0] && tokenIn!=pairTkns[1]) {
            continue
        } else if (tokenIn==pairTkns[0]) {
            tempOut = pairTkns[1]
        } else {
            tempOut = pairTkns[0]
        }
        newPath.push(tempOut)
        if (tokenOut==tempOut && path.length>2) {
            c = { 'route': [...currentPairs, pair.id], 'path': newPath }
            circles.push(c)
        } else if (maxHops > 1 && pairs.length > 1) {
            pairsExcludingThisPair = [...pairs.slice(0,i), ...pairs.slice(i+1)]
            circles = dfsFindPaths(pairsExcludingThisPair, tempOut, tokenOut, maxHops-1, [...currentPairs, pair.id], newPath, circles)
        }
    }
    return circles
}


circles = dfsFindPaths()
console.log(circles)