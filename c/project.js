module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//类目查询（首页）
	index(){
		if(!post(data => {
			if( !data.openid ) return api_error("5001"); 
			else this._getProject(data);
		} ) )end("Param Error!");
	}
	//二级类目查询(未用)
	twogameclass(){
		if(!post(data => {
			if ( !data.pro_id || !data.openid ) return api_error("5001");
			else this._getTwoGameClass(data);
		} ) )end("Param Error!");
	}
	//更多视频游戏(未用)
	twomoregamevideo(){
		if(!post(data => {
			this._getTwoMoreGameVideo(data);
		} ) )end("Param Error!");
	}
	//查询一级类目所有游戏(一期)（三期）
	projectgame(){
		if(!post(data => {
			if ( !data.pro_id ) return api_error("5001");
			else this._projectGame(data);
		} ) )end("Param Error!");
	}
	//从数据库中查出游戏数据(用于测试)
	gamemysql(){
		if(!post(data => {
			if ( !data.pro_id ) return api_error("5001");
			else this._mysqlGame(data);
		} ) )end("Param Error!");
	}
	//游戏视频(二期)
	_getAllGame(data){
		let res = {
			subscribe : 1,
		};
		let games = [];
		/*this.redis.hget("user", data.openid, resuser => {
			this.redis.hset("userid", String(resuser.id), data.openid);
		} );*/
		this.redis.hgetallvalue("games", resgames => {
			resgames = resgames || [];
			//查询用户订阅
			this.redis.hget("subscribe", data.openid, ressubscribe => {
				if( !ressubscribe ) res.subscribe = 0;
				resgames.recursion((i,item,next) => {
					item.recursion((j,item1,next1) => {
						item1.subscribe_style = {
							sub : {
								bgcolor : "#FFF"
							}
						};
						games.push(item1);
						next1();
					}, over => {
						next();
					} );
				}, over => {
					res.games = games;
					this.redis.hget("userplaygameresult", data.openid, resuserresult => {
						resuserresult = resuserresult || [];
						res.games.recursion((i,item,next) => {
							let j = resuserresult.search( {
								game_id : decrypt(item.id)
							} );
							if( j !== false){
								item.gameresult_state = 1;
							}
							else item.gameresult_state = 0;
							next();
						}, over => {
							this.redis.hget("userrecordstate", data.openid, resuserrecordstate => {
								if( !resuserrecordstate || resuserrecordstate.record_state == 0 ) {
									res.record_state = 0;
									return api_success(res);
								}
								else {
									resuserresult.recursion((i,item,next) => {
										this.redis.hget("game", item.game_id, resgame => {
											if( !resgame ) next();
											else{
												this.redis.hget("userrecordgamestate", data.openid + item.game_id, resrecordgamestate => {
													if( !resrecordgamestate || resrecordgamestate.gamerecord_state == 0 ) next();
													else {
														res.record_state = 1;
														return api_success(res);
													}
												} );
											}
										} );
									}, over => {
										res.record_state = 0;
										return api_success(res);
									} );
								}
							} );
						} );
					} );
				} );
			} );
		} );
	}
	//类目查询(首页)(一期)(三期)(注：此方法未修改)
	_getProject(data){
		let res = {};
		this.redis.get("project", resproject => {
			//查询用户订阅的类目
			this.redis.hget("subscribe_project", data.openid, ressubscribe_game => {
				ressubscribe_game = ressubscribe_game || [];
				resproject.recursion((i,item,next) => {
					if( ressubscribe_game.length == 0 ) item.subscribe_state = 0;
					ressubscribe_game.recursion((j,item1,next1) => {
						if( item.id == item1.pro_id ) item.subscribe_state = 1;
						else item.subscribe_state = 0;
						next1();
					}, over => {
						next();
					} );
				}, over => {
					this.redis.hget("newhand", data.openid, resnewhand => {
						if( !resnewhand ) res.newhand_state = 0;
						else res.newhand_state = 1;
						res.resproject = resproject;
						this.redis.hget("userrecordstate", data.openid, resuserrecordstate => {
							if( !resuserrecordstate || resuserrecordstate.record_state == 0 ) {
								res.record_state = 0;
								return api_success(res);
							}
							else {
								this.redis.hget("userplaygameresult", data.openid, resuserresult => {
									resuserresult = resuserresult || [];
									resuserresult.recursion((i,item,next) => {
										this.redis.hget("game", item.game_id, resgame => {
											if( !resgame ) next();
											else{
												this.redis.hget("userrecordgamestate", data.openid + item.game_id, resrecordgamestate => {
													if( !resrecordgamestate || resrecordgamestate.gamerecord_state == 0 ) next();
													else {
														res.record_state = 1;
														return api_success(res);
													}
												} );
											}
										} );
									}, over => {
										res.record_state = 0;
										return api_success(res);
									} );
								} );
							}
						} );
					} );
				} );
			} );
		} );
	}
	//查询一级类目所有游戏(一期)（三期）
	_projectGame(data){
		let res = {
			subscribe_state : 0
		};
		this.redis.hget("gamesByMain", decrypt(data.pro_id), resallgame => {
			resallgame = resallgame || [];
			this.redis.hget("subscribe_project", data.openid, ressub_project => {
				ressub_project = ressub_project || [];
				let n = ressub_project.search( {
					pro_id : decrypt(data.pro_id)
				} );
				if( n !== false ) res.subscribe_state = 1;
				this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
					resuserplaygameresult = resuserplaygameresult || [];
					resallgame.recursion((i,item,next) => {
						let j = resuserplaygameresult.search( {
							game_id : decrypt(item.id)
						} );
						if( j !== false ) item.gameresult_state = 1;
						else item.gameresult_state = 0;
						delete item.gc_id;
						delete item.setting;
						delete item.setting_new;
						delete item.result;
						delete item.sort;
						delete item.sex;
						delete item.locktype;
						delete item.lockcon;
						item.score = parseFloat(item.score).toFixed(1);
						next();
					}, over => {
						//用户点击一级类增加点击记录
						let procheck={
							openid : data.openid,
							pro_id : decrypt(data.pro_id),
							check_time : time()
						}
						rlog("addTgProcheck", procheck);
						return api_success(res);
					} );
				} );
			} );
		} );
	}
	//二级类目查询(未用)
	_getTwoGameClass(data){
		let res = {
			pro_id : data.pro_id,
			userplaygamevideo  : {
				name : "我玩过",
				playgame : []
			},
			gamevideolist : []
		};
		this.redis.hget("gameclass", decrypt(data.pro_id), resgameclass => {
			resgameclass = resgameclass || [];
			resgameclass.recursion((i,item,next) => {
				res.gamevideolist[i] = {};
				this.redis.hget("games", decrypt(item.id), resgame => {
					resgame = resgame || [];
					resgame = resgame.slice(0,4);
					res.gamevideolist[i] = item;
					res.gamevideolist[i].gamevideo = resgame;
					next();
				} );
			}, over => {
				this.redis.hget("userclearlockpro", data.openid + data.pro_id, userclearlockpro => {
					//用户点击一级类增加点击记录
					this.redis.hget("user",data.openid,resuser=>{
						data.user_id = resuser.id;
						rlog("addTgProcheck", data);
					} );
					if ( !userclearlockpro ) return api_success(res);
					else {
						res.userplaygamevideo.playgame = userclearlockpro.slice(0,4);
						return api_success(res);
					}
				} );
			} );
		} );
	}
	//更多视频查询(未用)
	_getTwoMoreGameVideo(data){
		if( !data.openid ){
			if( !data.gameclass_id ) return api_error("5001");
			else this.redis.hget("games", decrypt(data.gameclass_id), resgame => {
				return api_success(resgame);
			} );
		}
		else {
			if( !data.pro_id ) return api_error("5001");
			else this.redis.hget("userclearlockpro", data.openid + decrypt(data.pro_id), resuserclearlockpro => {
				let res = [];
				if ( !resuserclearlockpro ) return api_success(res);
				else return api_success(resuserclearlockpro);
			} );
		}
	}
	//从数据库中查出游戏数据(用于测试)(一期)
	_mysqlGame(data){
		data.pro_id = decrypt(data.pro_id);
		let resallgame = [];
		let mysql = LOAD.mysql();
		mysql.get("gameclass", {
			project_id : data.pro_id,
			state : 2
		}, '', '', '`id`', resgameclass => {
			resgameclass = resgameclass || [];
			resgameclass.recursion((i,item,next) => {
				mysql.get("game", "`gc_id` = " + item.id + " AND (`state` = 2 OR `state` = 3)", '', '', '`id`,`name`,`pic`,`gvideo_new`,`score`,`times`', resgame => {
					resgame = resgame || [];
					this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
						resuserplaygameresult = resuserplaygameresult || [];
						resgame.recursion((j,item1,next1) => {
							let index = resuserplaygameresult.search( {
								game_id : item1.id
							} );
							if( index !== false ) item1.gameresult_state = 1;
							else item1.gameresult_state = 0;
							item1.id = encrypt(String(item1.id));
							item1.score = parseFloat(item1.score).toFixed(1);
							resallgame.unshift(item1);
							next1();
						}, over => {
							next();
						} );
					} );
				} )				
			}, over => {
				mysql.close();
				return api_success(resallgame);
			} );
		} );
	}
	//从数据库中查出游戏数据(用于测试)(二期)
	_mysqlGameTwo(data){
		let res = {
			subscribe : 1,
		};
		let resallgame = [];
		let mysql = LOAD.mysql();
		mysql.get("gameclass", {
			state : 2
		}, '', '', '`id`', resgameclass => {
			resgameclass = resgameclass || [];
			resgameclass.recursion((i,item,next) => {
				mysql.get("game", "`gc_id` = " + item.id + " AND (`state` = 2 OR `state` = 3)", '', '', '`id`,`name`,`pic`,`gvideo_new`,`score`,`times`', resgame => {
					resgame = resgame || [];
					this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
						resuserplaygameresult = resuserplaygameresult || [];
						resgame.recursion((j,item1,next1) => {
							let index = resuserplaygameresult.search( {
								game_id : item1.id
							} );
							if( index !== false ) item1.gameresult_state = 1;
							else item1.gameresult_state = 0;
							item1.id = encrypt(String(item1.id));
							item1.score = parseFloat(item1.score).toFixed(1);
							resallgame.unshift(item1);
							next1();
						}, over => {
							next();
						} );
					} );
				} )				
			}, over => {
				mysql.close();
				return api_success(resallgame);
			} );
		} );
	}
}();
