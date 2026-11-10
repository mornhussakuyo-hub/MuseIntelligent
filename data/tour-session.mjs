/**
 * @param {import('../src/types').VisitState} state
 * @param {import('../src/types').Route} route
 * @param {'single'|'tour'|null} mode
 * @returns {import('../src/types').VisitState}
 */
export function completeArrival(state,route,mode){
 const id=route.artifactId;
 const advance=mode==='tour'&&!!id&&state.tour?.stops[state.tourIndex]===id;
 return {...state,cameraId:route.to,position:route.destination,
  visited:id&&!state.visited.includes(id)?[...state.visited,id]:state.visited,
  tourIndex:advance?state.tourIndex+1:state.tourIndex,
  tourArrivedId:advance?id:state.tourArrivedId,
 };
}
