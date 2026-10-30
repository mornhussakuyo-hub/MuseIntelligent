export interface Artifact {
 id:string; objectId:number; imageId:number; hall:string; name:string; english:string; era:string;
 material:string;dimensions:string;accession:string;cameraId:string;position:{x:number;y:number};
 shape:string;aliases:string[];story:string;childStory:string;lookFor:string[];number:string;caseSize:{w:number;h:number};
 source:string;remoteImage:string;image:string;institution:string;license:string;verifiedAt:string;credit:string;
}
export interface Camera {id:string;name:string;hall:string;x:number;y:number;angle:number;description:string}
export interface Hall {id:string;code:string;name:string;short:string;english:string;color:string;light:string;description:string;period:string;minutes:number;camera:string}
export interface Point {x:number;y:number}
export interface Route {from:string;to:string;targetId:string;artifactId:string|null;name:string;meters:number;minutes:number;nodes:{id:string;x:number;y:number;label:string}[];steps:string[];accessible:boolean;destination:Point;turns:number;through:string[];instructions:{x:number;y:number;direction:string;meters:number}[]}
export interface Tour {title:string;budget:number;stops:string[];segments:Route[];meters:number;minutes:number;completed:boolean}
export interface GuideResponse {text:string;mode:string;sources:string[];recommendations:string[];route:Route|null;tour:Tour|null;artifactId:string|null;notice?:string}
export interface Message extends Partial<GuideResponse> {id:string;role:'user'|'assistant';text:string;time:string}
export interface VisitState {visited:string[];favorites:string[];notes:Record<string,string>;cameraId:string;position?:Point;messages:Message[];audience:'adult'|'child';interest:string;minutes:number;tour:Tour|null;tourIndex:number}
