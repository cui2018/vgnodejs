const SERVERID = 3;
module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//客户端创建socket连接
	connection(socket) {
		socket.on("login", openid => {
			if( !openid ) return;
			socket.emit("login");
			this.redis.hset("socketid",socket.id,openid);
			this.redis.hget("userdaytime", openid, resuserdaytime => {
					let day1 = day();
					let time1 = time();
					let userontime = {
						openid : openid,
						daytime :day1,
						logintime : time1
					}
					if ( !resuserdaytime  || resuserdaytime.daytime < day1 ) {
						this.redis.hset("userdaytime", openid, {
							daytime : day1,
							logintime : time1
						} );
						rlog("add_tg_userontime",userontime);
					}
					else {
						this.redis.hset("userdaytime", openid, {
							daytime : day1,
							logintime : time1
						} );
						rlog("update_tg_userontime",userontime);
					}
				} );
		} );

		socket.on("timeByShare", gameid => {
			this.redis.hget("socketid", socket.id, openid => {
				if ( !openid ) return;
				this.redis.hget("game", decrypt(gameid), resgame => {
					if( !resgame ) return api_error("4501");
					this.redis.hget("user", openid, resuser => {
						let time1 =time();
						let userontime = {
							user_id : resuser.id,
							pro_id : resgame.project_id,
							gameclass_id : resgame.gc_id,
							game_id : decrypt(gameid),
							starttime : time1
						}
						this.redis.hset("usergametime", resuser.id,{
							starttime : time1,
							end : 0
						});
						rlog("add_tg_gameontime",userontime);
					});
				});
			});
		});

		socket.on("videoReconnect", res => {
			//socket.emit("videoReconnectSuccess");
			this.redis.hget("socketid", socket.id, openid => {
				//echo("游戏重新连接server:" + SERVERID + "; openid:"+openid +"; socketid:"+socket.id+"; 时间:"+time());
				if ( !openid ) return;
				else this.redis.hget("user", openid, resuser => {
					//echo("用户id  "+resuser.id)
					this.redis.hget("usergametime", resuser.id, resusergametime => {
						//echo(resusergametime.starttime);
						resusergametime = resusergametime || {};
						let day1 = day();
						let time1 = time();
						let userontime = {
							user_id : resuser.id,
							starttime : resusergametime.starttime,
							newstarttime : time1
						}
						this.redis.hset("usergametime",resuser.id,{
							starttime : time1,
							end : 0
						});
						rlog("reconnect_tg_userontime",userontime);
					});
				});
			});
		} );
	}
	//当客户端断开连接时 
	disconnect(socket) {
		let socketid = socket.id;
		this.redis.hget("socketid", socketid, openid => {
			this.redis.hdel("socketid",socketid);
			if( !openid ) return;
			else this.redis.hget("user", openid, resuser => {
				if ( !resuser ) return;
				this.redis.hget("userdaytime", openid, resuserdaytime => {
					let day1 =day();
					let time1 =time();
					let userontime = {
						openid : openid,
						daytime : day1,
						exittime : time1,
						ontime : time1-resuserdaytime.logintime,
						yesterday : resuserdaytime.daytime
					}
					if(resuserdaytime.daytime < day1){
						rlog("over_tg_userontime",userontime);
					}else if(resuserdaytime.daytime == day1){
						rlog("over2_tg_userontime",userontime);
					}		
				});
				this.redis.hget("usergametime", resuser.id, resusergametime => {
					resusergametime = resusergametime || {};
					if(resusergametime.end == 0){
						let time1 =time();
						let userontime = {
							user_id : resuser.id,
							starttime : resusergametime.starttime,
							endtime : time1,
							ontime : time1 - resusergametime.starttime
						}
						this.redis.hset("usergametime",resuser.id,{
							starttime : resusergametime.starttime,
							end : 1
						});
						rlog("over_tg_gameontime",userontime);
					}
				});
			});	
		});
	}
}();

//向一个房间广播消息（发送者收不到消息）：socket.broadcast.to('your room name').emit('broadcast room message');
//向一个房间广播消息（包括发送者都能收到消息）（这个API属于io.sockets）：io.sockets.in('another room name').emit('broadcast room message');
//io.sockets.socket(socketid).emit(‘String’, data);//给指定的客户端发送消息
//this.io.sockets.adapter.rooms 获取房间列表 this.io.sockets.adapter.rooms.roomList 指定房间的中用户列表
//this.socket.leave("roomList"); 离开房间