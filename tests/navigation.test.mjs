import test from 'node:test';
import assert from 'node:assert/strict';
import {completeArrival} from '../data/tour-session.mjs';
import {planTour,routeTo} from '../data/navigation.mjs';
import {answerLocally} from '../data/local-guide.mjs';
import {getArtifact} from '../data/catalog.mjs';

test('an explicit whole-museum request overrides the previously selected theme',()=>{
 const {tour}=answerLocally('生成全馆推荐路线',{cameraId:'L0',interest:'ceramic'});
 assert.equal(tour.title,'全馆精选');
 assert.equal(new Set(tour.stops.map(id=>getArtifact(id).hall)).size,3);
});

test('a multi-stop tour advances through every stop, survives a reload and ignores duplicate arrivals',()=>{
 const tour=planTour('L0',{minutes:60});
 let state={cameraId:'L0',position:undefined,visited:[],tour,tourIndex:0,tourArrivedId:null};
 for(const [i,id] of tour.stops.entries()){
  const route=routeTo(state.cameraId,id,state.position);
  state=completeArrival(state,route,'tour');
  assert.equal(state.tourIndex,i+1);assert.equal(state.tourArrivedId,id);
  assert.deepEqual(state.position,route.destination);
  state=JSON.parse(JSON.stringify(state));
  assert.equal(completeArrival(state,route,'tour').tourIndex,i+1);
 }
 assert.equal(state.tourIndex,tour.stops.length);
 assert.equal(new Set(state.visited).size,tour.stops.length);
});
test('single-stop navigation cannot advance or replace the multi-stop queue',()=>{
 const tour=planTour('L0',{minutes:30});
 const state={cameraId:'L0',visited:[],tour,tourIndex:0,tourArrivedId:null};
 const result=completeArrival(state,routeTo('L0',tour.stops[0]),'single');
 assert.equal(result.tourIndex,0);assert.equal(result.tour,tour);assert.equal(result.tourArrivedId,null);
 assert.ok(result.visited.includes(tour.stops[0]));
});
