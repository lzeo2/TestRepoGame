/*
 Source: https://github.com/astropanic/JIX
 License: MIT - commit c08594ec0423af2001a1a3904f745649e375dec8
 Modifications: see index.html header.
*/
var Hud = function(){
	var meterEl = this._getMeterEl();

	this.claim = 0;
	this.initTime = 30;
	this.oldMeterWidth = this.meterWidth = meterEl.offsetWidth;
	this.meterTick = (this.meterWidth / 100) / this.initTime; // Fixme Tick has wrong time interval.
};

Hud.prototype.setClaim = function(value){
	value = value < 0 ? 0 : value > 100 ? 100 : value;

	this.claim = value;
	this.updateClaimEl();
};

Hud.prototype.updateClaimEl = function(){
	var claimEl = document.getElementById('claim'),
		sheetEl = claimEl.children[0],
		flySheetEl = sheetEl.cloneNode(true);

	claimEl.appendChild(flySheetEl);

	sheetEl.innerHTML = this.claim + '%';

	// Animate
	setTimeout(function () {
		flySheetEl.classList.add('away');
	}, 100);

	// Garbage Collector
	setTimeout(function () {
		claimEl.removeChild(flySheetEl);
	}, 5000);
};

Hud.prototype.updateTimer = function () {
	var meterEl = this._getMeterEl();

	this.meterWidth -= this.meterTick;

	if (this.oldMeterWidth - this.meterWidth >= 1) {
		this.oldMeterWidth = this.meterWidth;

		if (this.meterWidth <= 0) {
			this.meterWidth = 0;

			this.onTimeOver();

			this.updateTimer = function(){}; // Fake stop.
		}

		if (this.meterWidth >= 0) {
			meterEl.style.setProperty('width', this.meterWidth + 'px');
		}
	}
};

// This method is called when the time is over.
Hud.prototype.onTimeOver = function(){
	// Lose state: surface the wired restart affordance next to the visual
	// game-over clone below (the button ships hidden and had no unhide path).
	document.getElementById('restartBtn').hidden = false;

	var claimEl = document.getElementById('claim'),
		sheetEl = claimEl.children[0].cloneNode(true);

	claimEl.appendChild(sheetEl);

	// Animate
	setTimeout(function () {
		sheetEl.classList.add('game-over');
	}, 100);

};

Hud.prototype._getMeterEl = function(){
	return document.getElementById('meter');
};
