// ─── 场景管理器 ──────────────────────────
// 管理游戏的各个 UI 场景（标题、选角色、选诅咒、游戏中、升级、结算等）

class SceneManager {
	constructor(game) {
		this.game = game;
		this.scenes = {};
		this.currentScene = null;
		this.currentSceneName = '';
	}

	register(name, scene) {
		this.scenes[name] = scene;
		scene.manager = this;
		scene.game = this.game;
	}

	/**
	 * 切换场景
	 * @param {string} name 
	 * @param {Object} data - 传递给新场景的数据
	 */
	switchTo(name, data) {
		if (this.currentScene && this.currentScene.exit) {
			this.currentScene.exit();
		}
		this.currentSceneName = name;
		this.currentScene = this.scenes[name];
		if (this.currentScene && this.currentScene.enter) {
			this.currentScene.enter(data || {});
		}

		// 切换场景时管理 input interceptor
		if (name === 'playing') {
			this.game.input.clearInterceptor();
		} else {
			this.game.input.setInterceptor((type, x, y) => {
				if (!this.currentScene) return;
				if (type === 'start' && this.currentScene.onTouchStart) {
					this.currentScene.onTouchStart(x, y);
				} else if (type === 'move' && this.currentScene.onTouchMove) {
					this.currentScene.onTouchMove(x, y);
				} else if (type === 'end' && this.currentScene.onTouchEnd) {
					this.currentScene.onTouchEnd(x, y);
				}
			});
		}
	}

	update(dt) {
		if (this.currentScene && this.currentScene.update) {
			this.currentScene.update(dt);
		}
	}

	draw(ctx, w, h) {
		if (this.currentScene && this.currentScene.draw) {
			try {
				this.currentScene.draw(ctx, w, h);
			} catch (e) {
				console.error(e);
				// Critical Fallback Draw
				ctx.fillStyle = 'red';
				ctx.font = '20px sans-serif';
				ctx.textAlign = 'left';
				ctx.fillText("Render Error: " + e.message, 10, h / 2);
			}
		}
	}

	isScene(name) {
		return this.currentSceneName === name;
	}
}

module.exports = SceneManager;
