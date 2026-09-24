var setting_manual_count_scores_default = false;
var setting_muggins_default = false;
var setting_hints_default = false;
var setting_warn_suboptimal_default = false;
var setting_fast_count_default = false;
var setting_board_color_default = 'wood';
var setting_card_color_default = 'blue';

function GetSetting(setting) {
	switch (setting) {
		case "setting_manual_count_scores":
			var settingVal = window.localStorage.getItem(setting);
			return settingVal == null ? setting_manual_count_scores_default : (settingVal == 'true');
			break;
		case "setting_muggins":
			var settingVal = window.localStorage.getItem(setting);
			return settingVal == null ? setting_muggins_default : (settingVal == 'true');
			break;
		case "setting_hints":
			var settingVal = window.localStorage.getItem(setting);
			return settingVal == null ? setting_hints_default : (settingVal == 'true');
			break;
		case "setting_warn_suboptimal":
			var settingVal = window.localStorage.getItem(setting);
			return settingVal == null ? setting_warn_suboptimal_default : (settingVal == 'true');
			break;
		case "setting_fast_count":
			var settingVal = window.localStorage.getItem(setting);
			return settingVal == null ? setting_fast_count_default : (settingVal == 'true');
			break;
		case "setting_board_color":
			var settingVal = window.localStorage.getItem(setting);
			return settingVal == null ? setting_board_color_default : settingVal;
			break;
		case "setting_card_color":
			var settingVal = window.localStorage.getItem(setting);
			return settingVal == null ? setting_card_color_default : settingVal;
			break;
	}
}

function SetSetting(setting, val) {
	window.localStorage.setItem(setting, val);
}

function GetStatistic(statistic) {
    var val = window.localStorage.getItem(statistic);
    return val == null ? Number(0) : Number(val);
}

function GetStatisticString(statistic) {
	var val = window.localStorage.getItem(statistic);
	return val == null ? "" : val;
}

function SetStatistic(statistic, value) {
	window.localStorage.setItem(statistic, value);
}

