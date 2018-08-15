const AES = LOAD.library("aes");
module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//用户点击视频游戏(游戏详情)
	clickgamevideo(){
		if(!post(data => {
			if( !data.openid || !data.game_id ) return api_error("5001");
			else this._clickGameVideoTwo(data);
		} ) )end("Param Error!");
	}
	//用户点击视频游戏查看游戏结果
	gameresult(){
		if(!post(data => {
			if( !data.openid || !data.game_id ) return api_error("5001");
			else this._gameresultTwo(data);
		} ) )end("Param Error!");
	}
	//用户分享
	sharegamevideo(){
		if(!post(data => {
			if( !data.openid ) return api_success();
			else this._shareGameVideoTwo(data);
		} ) )end("Param Error!");
	}
	//用户开玩游戏
	userplaygamevideo(){
		if(!post(data => {
			if( !data.openid || !data.game_id ) return api_error("5001");
			else this._userPlayGameTwo(data);
		} ) )end("Param Error!");
	}
	//用户完成新手引导
	newhandending(){
		if(!post(data => {
			if( !data.openid ) return api_success();
			else this._newhandEnding(data);
		} ) )end("Param Error!");
	}
	//用户完成结果新手引导
	newhandresultending(){
		if(!post(data => {
			if( !data.openid ) return api_success();
			else this._newhandResultEnding(data);
		} ) )end("Param Error!");
	}
	//用户点击视频游戏(游戏详情)
	_clickGameVideoTwo(data){
		this.redis.hget("gamecomment", decrypt(data.game_id), gamecomment => {
			let rescomment = [];
			gamecomment = gamecomment || [];
			gamecomment.recursion((i,item,next) => {
				this.redis.hget("user", item.openid, resuser => {
					delete item.openid;
					delete item.game_id;
					delete item.update_time;
					item.com_time = parseInt(item.com_time).timeFormat("%Y-%m-%d");
					if( typeof item.state == "undefined" || item.state == 1 ) {
						if( item.state ) delete item.state;
						item.nick = resuser.nick ? resuser.nick : "用户";
						item.headimg = resuser.headimg ? resuser.headimg : "https://vgame-cdn.edisonluorui.com/upload/2018/0802/20180802093552794.jpg";
						rescomment.push(item);
						if( rescomment.length >= 3 ){
							resgameinfo.call(this, data, rescomment);
						}
						else next();
					}
					else next();
				} );
			}, over => {
				resgameinfo.call(this, data, rescomment);
			} );
		} );
		function resgameinfo(data, rescomment){
			//游戏详情
			this.redis.hget("game", decrypt(data.game_id), resgame => {
				if( !resgame ) return api_error("4501");
				else {
					let res = {
						comment : rescomment || [],
						score : parseFloat(resgame.score).toFixed(1),
						game_id : data.game_id,
						times : resgame.times,
						desc : resgame.desc,
						name :resgame.name,
						pic : resgame.pic,
						gameresult_state : 0
					};
					this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
						resuserplaygameresult = resuserplaygameresult || [];
						let i = resuserplaygameresult.search( {
							game_id : decrypt(data.game_id)
						} );
						if( i !== false ){
							res.gameresult_state = 1;
						}
						this.redis.hget("sharegamelist", data.openid, resharegamelist => {
							resharegamelist = resharegamelist || [];
							let i = resharegamelist.search( {
								game_id : decrypt(data.game_id)
							} );
							if( i !== false ){
								if( resharegamelist[i].sharestate == 1 ){
									res.clearsharelock = 1;
								}
								else {
									res.clearsharelock = 1;
								}
							}
							else {
								res.clearsharelock = 1;
							}
							return api_success(res);
						} );
					} );
				}
			} );
		}
	}
	//用户点击视频游戏查看游戏结果
	_gameresultTwo(data){
		this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
			resuserplaygameresult = resuserplaygameresult || [];
			let i = resuserplaygameresult.search( {
				game_id : decrypt(data.game_id)
			} );
			if ( i !== false ) {
				this.redis.hget("game", decrypt(data.game_id), resgame => {
					if( !resgame ) return api_error("4501");
					else {
						resgame.result.setting[resuserplaygameresult[i].grade][2].recursion((j,item,next) => {
							delete resuserplaygameresult[i].game_id;
							delete resuserplaygameresult[i].time;
							if(resuserplaygameresult[i].result_score > item.max){
								next();
							}
							else {
								delete resuserplaygameresult[i].grade;
								resuserplaygameresult[i].newstate = 0;
								this.redis.hget("newhandresult", data.openid, resnewhandresult => {
									resuserplaygameresult[i].result = {
										content : item.content,
										title : item.title
									};
									if ( !resnewhandresult) resuserplaygameresult[i].newstate = 1;
									return api_success(resuserplaygameresult[i]);
								} );
							}
						}, over => {
							let gamecontent = resgame.result.setting[resuserplaygameresult[i].grade][2][resgame.result.setting[resuserplaygameresult[i].grade][2].length - 1]
							delete resuserplaygameresult[i].grade;
							resuserplaygameresult[i].newstate = 0;
							this.redis.hget("newhandresult", data.openid, resnewhandresult => {
								resuserplaygameresult[i].result = {
									content : gamecontent.content,
									title : gamecontent.title
								};
								if ( !resnewhandresult) resuserplaygameresult[i].newstate = 1;
								return api_success(resuserplaygameresult[i]);
							} );
						} );
					}
				} );
			}
			else{
				return api_error("4401");
			}
		} );
	}
	_gameresult(data){
		this.redis.hget("gamecomment", decrypt(data.game_id), gamecomment => {
			let rescomment = [];
			gamecomment = gamecomment || [];
			gamecomment.recursion((i,item,next) => {
				delete item.openid;
				delete item.game_id;
				delete item.update_time;
				item.com_time = item.com_time.timeFormat("%Y-%m-%d");
				if( typeof item.state == "undefined" || item.state == 1 ) {
					if( item.state ) delete item.state;
					rescomment.push(item);
					if( rescomment.length >= 3 ){
						resgameinfo.call(this, data, rescomment);
					}
					else next();
				}
				else next();
			}, over => {
				resgameinfo.call(this, data, rescomment);
			} );
		} );
		function resgameinfo(data, rescomment){
			this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
				resuserplaygameresult = resuserplaygameresult || [];
				let i = resuserplaygameresult.search( {
					game_id : decrypt(data.game_id)
				} );
				if ( i !== false ) {
					resuserplaygameresult[i].comment = rescomment.slice(0, 3);
					this.redis.hget("game", decrypt(data.game_id), resgame => {
						if( !resgame ) return api_error("4501");
						else {
							delete resuserplaygameresult[i].game_id;
							delete resuserplaygameresult[i].grade;
							resuserplaygameresult[i].times = resgame.times;
							this.redis.hget("sharegamelist", data.openid, resharegamelist => {
								resuserplaygameresult[i].game = {
									game_id : data.game_id,
									pic : resgame.pic,
									name : resgame.name
								};
								resharegamelist = resharegamelist || [];
								let j = resharegamelist.search( {
									game_id : decrypt(data.game_id)
								} );
								if( j !== false ){
									if( resharegamelist[j].sharestate == 1 ){
										resuserplaygameresult[i].clearsharelock = 1;
									}
									else {
										resuserplaygameresult[i].clearsharelock = 1;
									}
								}
								else {
									resuserplaygameresult[i].clearsharelock = 1;
								}
								resuserplaygameresult[i].newstate = 1;
								this.redis.hget("gameresultstate", data.openid, resgameresultstate => {
									if ( !resgameresultstate) resuserplaygameresult[i].newstate = 0;
									return api_success(resuserplaygameresult[i]);
								} );
							} );
						}
					} );
				}
				else{
					return api_error("4401");
				}
			} );
		}
	}
	//用户分享
	_shareGameVideoTwo(data){
		this.redis.hget("user", data.openid, resuser => {
			rlog("addUserShare", {
				user_id : resuser.id,
				share_day : day(),
				game_id : decrypt(data.game_id) || 0
			} );
		} );
		if( !data.game_id ){
			return api_success();
		}
		else {
			this.redis.hget("sharegamelist", data.openid, resharegamelist => {
				resharegamelist = resharegamelist || [];
				let i = resharegamelist.search( {
					game_id : decrypt(data.game_id)
				} );
				if( i !== false ){
					resharegamelist[i].sharestate = 1;
					this.redis.hset("sharegamelist", data.openid, resharegamelist);
				}
				else {
					let sharegame = {
						game_id : decrypt(data.game_id),
						sharestate : 1
					};
					resharegamelist.unshift(sharegame);
					this.redis.hset("sharegamelist", data.openid, resharegamelist);
				}
				return api_success();
			} );
		}
	}
	//用户开玩游戏
	_userPlayGameTwo(data){
		this.redis.hget("game", decrypt(data.game_id), resgame => {
			if( !resgame ) return api_error("4501");
			else {
				//用户开始玩游戏（计时开始）
				userrecord.call(this, data, resgame);
				//存储用户玩过的游戏
				userplaygameredis.call(this, data);
				this.redis.hget("startgame", data.openid, restartgame => {
					restartgame = restartgame || [];
					let i = restartgame.search( {
						game_id : decrypt(data.game_id)
					} );
					let startgame = 1;
					if( i !== false ){
						if( restartgame[i].state == 0 ) startgame = 2;
						restartgame[i].state = 0;
						this.redis.hset("startgame", data.openid, restartgame);
					}
					else {
						restartgame.unshift( {
							game_id : decrypt(data.game_id),
							state : 0
						} );
						this.redis.hset("startgame", data.openid, restartgame);
					}
					return api_success( {
						newhand : encrypt("0"),
						orientation : resgame.orientation,
						startgame : startgame,
						setting : resgame.setting,
						result_guide : resgame.result_guide,
						version : resgame.version
					} );
				} );
				
			}
		} );
		function userplaygameredis(data){
			this.redis.hget("userplaygame", data.openid, resuserplaygame => {
				resuserplaygame = resuserplaygame || [];
				let i = resuserplaygame.search(decrypt(data.game_id));
				if( i === false ){
					resuserplaygame.unshift(decrypt(data.game_id));
					this.redis.hset("userplaygame", data.openid, resuserplaygame);
				}
				this.redis.hget("user", data.openid, resuser => {
					if( !resuser || resuser.id == 0 ) return;
					else {
						let userplaygamedata = {
							user_id : resuser.id,
							game_id : decrypt(data.game_id)
						};
						rlog("addAndUpUserPlayGame", userplaygamedata);
						return;
					}
				} );
			} );
		}
		function userrecord(data, resgame){
			this.redis.hget("user",data.openid, resuser2=>{
				if( !resuser2 || resuser2.id == 0 ) return;
				else {
					let time1 =time();
					let userontime = {
						user_id : resuser2.id,
						pro_id : resgame.project_id,
						gameclass_id : resgame.gc_id,
						game_id : decrypt(data.game_id),
						starttime : time1
					}
					this.redis.hset("usergametime", resuser2.id,{
						starttime : time1,
						end : 0
					});
					rlog("add_tg_gameontime",userontime);
					return;
				}
			});
		}
	}
	//用户完成新手引导(一期)(二期)
	_newhandEnding(data){
		this.redis.hset("newhand", data.openid, {
			state : 1,
			newhand_time : time()
		}, res => {
			this.redis.hget("user", data.openid, resuser => {
				if( !resuser ) return api_success();
				let newhand = {
					user_id : resuser.id,
					newhandtime : time()
				};
				rlog("addNewHand", newhand);
			} );
			return api_success();
		} );
	}
	//用户完成结果新手引导(二期)
	_newhandResultEnding(data){
		this.redis.hset("newhandresult", data.openid, {
			state : 1,
			result_time : time()
		} );
		return api_success();
	}
}();