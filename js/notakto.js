// notakto.js - logic for playing notakto game
//
// computer logic from https://arxiv.org/pdf/1301.1672v1.pdf

function $(elem) { return document.getElementById(elem); }

var	nboard=3;
var	boards=[0,0,0];
var boardx=[0,0,0];
var	boardpos=[[50,50],[450,50],[250,450]];
var cellsize=100;
var	gridsize=10;
var	ntries=0;
var	gametype=0;

var BIT=[256,128,64,32,16,8,4,2,1];
var LINES=[256+128+64,32+16+8,4+2+1,256+32+4,128+16+2,64+8+1,256+16+1,64+16+4];
var	LINERC=[
	[[0,0],[0,2]], [[1,0],[1,2]], [[2,0],[2,2]],
	[[0,0],[2,0]], [[0,1],[2,1]], [[0,2],[2,2]],
	[[0,0],[2,2]], [[0,2],[2,0]] ];
var	PLAYERS=[['1','2'],['1','C'],['C','2']];

// draw the boards
function displayboards(thinking)
{
	// create drawing context
	var cnv=document.getElementById("board");
	var crect = cnv.getBoundingClientRect();
	var ctx=cnv.getContext("2d");
	ctx.clearRect(0, 0, cnv.width, cnv.height);
	ctx.strokeStyle="#E0E0E0";
	ctx.lineWidth=1;
	ctx.beginPath();
	ctx.moveTo(0,0);
	ctx.lineTo(799,0);
	ctx.lineTo(799,799);
	ctx.lineTo(0,799);
	ctx.lineTo(0,0);
	ctx.stroke();

	// draw grids
	ctx.strokeStyle="#404040";
	ctx.lineWidth=gridsize;
	ctx.lineCap='round';
	for (var i=0;i<nboard;i++) {
		for (var j=1;j<=2;j++) {
			ctx.beginPath();
			ctx.moveTo(boardpos[i][0]+j*cellsize,boardpos[i][1]);
			ctx.lineTo(boardpos[i][0]+j*cellsize,boardpos[i][1]+3*cellsize);
			//ctx.stroke();
			//ctx.beginPath();
			ctx.moveTo(boardpos[i][0],boardpos[i][1]+j*cellsize);
			ctx.lineTo(boardpos[i][0]+3*cellsize,boardpos[i][1]+j*cellsize);
			ctx.stroke();
		}
	}

	// draw X's
	ctx.fillStyle="#606060";
	ctx.font=cellsize+"px BlackHand";
	ctx.textAlign="center";
	ctx.textBaseline="middle";
	for (var i=0;i<nboard;i++) {
		for (var j=0;j<9;j++) {
			if (boards[i]&BIT[j]) {
				var r=Math.floor(j/3);
				var c=j%3;
				ctx.fillText("X",boardpos[i][0]+c*cellsize+cellsize/2,boardpos[i][1]+r*cellsize+cellsize/2+10);
			}
		}
	}

	// draw lines
	for (var i=0;i<nboard;i++) {
		for (var j=0;j<LINES.length;j++) {
			if ((boards[i]&LINES[j])==LINES[j]) {
				//console.log("board "+i+" line "+j+" found");
				ctx.strokeStyle="#F08040";
				ctx.lineWidth=gridsize;
				ctx.lineCap='round';
				ctx.beginPath();
				ctx.moveTo(boardpos[i][0]+LINERC[j][0][1]*cellsize+cellsize/2,boardpos[i][1]+LINERC[j][0][0]*cellsize+cellsize/2);
				ctx.lineTo(boardpos[i][0]+LINERC[j][1][1]*cellsize+cellsize/2,boardpos[i][1]+LINERC[j][1][0]*cellsize+cellsize/2);
				ctx.stroke();
				boardx[i]=1;
				// overlay mask
				ctx.fillStyle="rgba(0,0,0,0.3)";
				ctx.fillRect(boardpos[i][0]-10,boardpos[i][1]-10,3*cellsize+20,3*cellsize+20);
				break;
			}
		}
	}

	// display 1st/2nd player
	ctx.strokeStyle="#C0C0C0";
	ctx.fillStyle="#C06060";
	ctx.font=(1.9*cellsize)+"px BlackHand";
	ctx.textBaseline="bottom";
	ctx.lineWidth=3;
	if (ntries%2) {
		// player 2
		ctx.textAlign="left";
		ctx.strokeText(PLAYERS[gametype][0],0+40,800);
		ctx.textAlign="right";
		ctx.fillText(PLAYERS[gametype][1],800-40,800);
	}
	else {
		// player 1
		ctx.textAlign="left";
		ctx.fillText(PLAYERS[gametype][0],0+40,800);
		ctx.textAlign="right";
		ctx.strokeText(PLAYERS[gametype][1],800-40,800);
	}

	// check for end of game
	if (checkwinner()) {
		// overlay mask
		ctx.fillStyle="rgba(0.5,0,0,0.3)";
		ctx.fillRect(0,0,800,800);
		ctx.fillStyle="#E0E060";
		ctx.font=cellsize+"px BlackHand";
		ctx.textBaseline="middle";
		ctx.textAlign="center";
		if (ntries%2) {
			ctx.fillText("Player "+PLAYERS[gametype][1]+" Wins!",400,400);
		}
		else {
			ctx.fillText("Player "+PLAYERS[gametype][0]+" Wins!",400,400);
		}
	}
	else if (thinking) {
		ctx.fillStyle="#60E0E0";
		ctx.font=cellsize+"px BlackHand";
		ctx.textBaseline="middle";
		ctx.textAlign="center";
		ctx.fillText("Thinking",400,400);
	}
}

// evaluate boards
function evaluate(bds)
{
	var val=BDANAL[bds[0]]*BDANAL[bds[1]]*BDANAL[bds[2]];
	//console.log("eval=>"+val);
	var oval=0;
	while (oval!=val) {
		oval=val;
		if ((val%49)==0) val = (val*25)/49;	// d^2 => c^2
		if ((val%125)==0) val = (val*2)/5;	// c^3 => a c^2
		if ((val%35)==0) val = (val*2)/5;	// c d => a d
		if ((val%4)==0) val /= 4;			// a^2 => 1
		if ((val%27)==0) val /= 9;			// b^3 => b
		if ((val%45)==0) val /= 9;			// b^2 c => c
		if ((val%63)==0) val /= 9;			// b^2 d => d
	}
	//console.log("efix=>"+val);

	if ((val==2)||(val==9)||(val==15)||(val==25))
		return(2);	// winning
	else if (val==1)
		return(0);	// lost
	else
		return(1);	// losing
}


// computer move
function computemove()
{
	//console.log("Compute move");
	wlist=[];	// winning moves
	olist=[];	// other moves
	llist=[];	// losing moves
	for (var i=0;i<3;i++) if (boardx[i]==0) {
		for (var j=0;j<9;j++) if ((boards[i] & BIT[j])==0) {
			var bds=boards.slice();
			bds[i] |= BIT[j];
			var flg=evaluate(bds);
			if (flg==2)
				wlist.push([i,j]);
			else if (flg==1)
				olist.push([i,j]);
			else
				llist.push([i,j]);
		}
	}
	displayboards(1);
	console.log("wlen="+wlist.length+" olen="+olist.length+" llen="+llist.length);
	if (wlist.length > 0) {
		console.log("Make winning move");
		var i=Math.floor(Math.random()*wlist.length);
		setTimeout(function() { makemove(wlist[i][0],wlist[i][1]); },750);
	}
	else if (olist.length > 0) {
		console.log("Make other move");
		var i=Math.floor(Math.random()*olist.length);
		setTimeout(function() { makemove(olist[i][0],olist[i][1]); },750);
	}
	else if (llist.length > 0) {
		console.log("Make losing move");
		var i=Math.floor(Math.random()*llist.length);
		setTimeout(function() { makemove(llist[i][0],llist[i][1]); },750);
	}
}


// save boards to cookie on user's machine
function saveboards()
{
	var s=JSON.stringify(boards);
	var exp = new Date();
	exp.setHours(23);
	exp.setMinutes(59);
	exp.setSeconds(59);
	document.cookie = "notakto="+s+"; expires=" + exp.toGMTString();
}

// get a variable from a cookie string
function getCookieData(labelName)
{
	var labelLen = labelName.length;
	var cookieData = document.cookie;
	var cLen = cookieData.length;
	var i = 0;
	var cEnd;
	while (i < cLen) {
		var j = i + labelLen;
		if (cookieData.substring(i,j) == labelName) {
			cEnd = cookieData.indexOf(";",j);
			if (cEnd == -1) {
				cEnd = cookieData.length;
			}
			return unescape(cookieData.substring(j+1, cEnd));
		}
		i++;
	}
	return "";
}

// restore board from cookie on user's machine
function restoreboard()
{
	var s=getCookieData("notakto");
	if (s!="") {
		boards=JSON.parse(s);
	}
}

// check for a winner
function checkwinner()
{
	// report winner
	return(boardx[0]*boardx[1]*boardx[2]);
}

// make a move
function makemove(bd,cell)
{
	boards[bd] |= BIT[cell];
	ntries++;
	displayboards(0);
	checkwinner();
	saveboards();
}


// select a cell specified by x,y position on canvas
function SelectCell(x,y)
{
	//console.log("x="+x+" y="+y);
	// only allow human moves when it's their turn
	if ((gametype==1)&&((ntries%2)==1)) return;
	if ((gametype==2)&&((ntries%2)==0)) return;

	var board=-1;
	for (var i=0;i<nboard;i++) if (boardx[i]==0) {
		if ((boardpos[i][0]<=x)&&(x<=boardpos[i][0]+3*cellsize)&&
			(boardpos[i][1]<=y)&&(y<=boardpos[i][1]+3*cellsize))
			board=i;
	}
	if ((0<=board)&&(board<nboard)) {
		var c=Math.floor((x-boardpos[board][0])/cellsize);
		var r=Math.floor((y-boardpos[board][1])/cellsize);
		//console.log("board "+board+" row "+r+" col "+c);
		var b=3*r+c;
		if ((boards[board]&BIT[b])==0) {
			makemove(board,b);
			if (gametype!=0) computemove();
		}
		else
			console.log("Cell occupied");
	}
	else
		console.log("Not a cell");
}

function mousedown(e)
{
	var boardcanvas = $("board");
	if (!e) e = window.event;
	e.preventDefault();
	var crect = boardcanvas.getBoundingClientRect();

	var x = e.clientX - crect.left;
	var y = e.clientY - crect.top;

	SelectCell(x*800/crect.width,y*800/crect.height);
	return false;
}

function touchstart(e)
{
	var boardcanvas = $("board");
	if (!e) e = window.event;
	e.preventDefault();
	var crect = boardcanvas.getBoundingClientRect();

	var x = e.touches[0].clientX - crect.left;
	var y = e.touches[0].clientY - crect.top;

	SelectCell(x*800/crect.width,y*800/crect.height);
	return false;
}

function resetgame(gtype)
{
	for (var i=0;i<nboard;i++) { boards[i]=0; boardx[i]=0; }
	ntries=0;
	saveboards();
	displayboards(0);
	gametype=gtype;
	displayboards(0);
	if (gametype==2) computemove();
}