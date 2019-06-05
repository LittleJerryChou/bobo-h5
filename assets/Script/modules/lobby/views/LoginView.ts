import { SDKManager } from "../../chanelSdk/SDKManager";
import { DataStore, Dialog, HTTP, LEnv, LobbyModuleInterface, Logger } from "../lcore/LCoreExports";
import { proto } from "../proto/protoLobby";
import { LobbyView } from "./LobbyView";
import { Enum } from "../../common/Enum";

const { ccclass } = cc._decorator;

/**
 * LoginView 登录界面
 */
@ccclass
export class LoginView extends cc.Component {
    private viewNode: fgui.GComponent;
    private win: fgui.Window;

    private loginBtn: fgui.GObject;
    private weixinButton: fgui.GObject;
    private progressBar: fgui.GProgressBar;

    private eventTarget: cc.EventTarget;

    private button: UserInfoButton = null;

    public showLoginView(): void {
        const lm = <LobbyModuleInterface>this.getComponent("LobbyModule");
        const loader = lm.loader;
        loader.fguiAddPackage("lobby/fui_login/lobby_login");
        const view = fgui.UIPackage.createObject("lobby_login", "login").asCom;

        const win = new fgui.Window();
        win.contentPane = view;
        win.modal = true;

        this.viewNode = view;
        this.win = win;

        this.initView();

        this.win.show();

        SDKManager.instance.initSDK();
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            if (LEnv.chanelType === Enum.CHANNEL_TYPE.WEIXIN) {
                this.createWxBtn();
            } else {
                console.log('not wx channel');
            }
        } else {
            console.log('not wx platform');
        }
    }

    public initView(): void {
        // buttons
        this.loginBtn = this.viewNode.getChild("n2");
        this.weixinButton = this.viewNode.getChild("n3");
        this.progressBar = this.viewNode.getChild("n4").asProgress;

        const gameAdviceText = this.viewNode.getChild("gameAdvice");
        const text1 = this.viewNode.getChild("text1");
        const text2 = this.viewNode.getChild("text2");
        const text3 = this.viewNode.getChild("text3");
        const text4 = this.viewNode.getChild("text4");
        const text5 = this.viewNode.getChild("text5");
        const text6 = this.viewNode.getChild("text6");

        const versionName = this.viewNode.getChild("versionName");
        versionName.text = LEnv.VER_STR;

        gameAdviceText.text = "抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。";
        text1.text = "出版单位：深圳市xxx科技有限公司";
        text2.text = "审批文号：xxxxxxxxxxxx";
        text3.text = "网络游戏出版物号：123456789";
        text4.text = "游戏著作权人：深圳市xxx科技有限公司";
        text5.text = "增值电信业务：46546546546";
        text6.text = "粤网文：深圳市xxx科技有限公司";

        this.loginBtn.visible = false;
        this.weixinButton.visible = false;
        this.progressBar.value = 0;
        this.progressBar.visible = false;

        this.loginBtn.onClick(this.onLoginClick, this);

        this.weixinButton.onClick(this.onWeixinBtnClick, this);

        // local progress = progressView.new(this)
        // progressView: updateView(this)
        this.updateCompleted();
    }

    public updateCompleted(): void {
        this.progressBar.visible = false;
        this.weixinButton.visible = true;
        this.loginBtn.visible = true;
    }

    public onLoginClick(): void {
        Logger.debug("onQuicklyBtnClick");
        this.quicklyLogin();
    }

    public onWeixinBtnClick(): void {
        Logger.debug("onWeixinBtnClick");
    }

    public quicklyLogin(): void {
        // 快速登录
        const account = DataStore.getString("account", "");
        const quicklyLoginURL = `${LEnv.rootURL}${LEnv.quicklyLogin}?&account=${account}`;

        Logger.trace("quicklyLogin, quicklyLoginURL:", quicklyLoginURL);

        HTTP.hGet(this.eventTarget, quicklyLoginURL, (xhr: XMLHttpRequest, err: string) => {
            let errMsg = null;
            if (err !== null) {
                errMsg = `登录错误，错误码:${err}`;
            } else {
                errMsg = HTTP.hError(xhr);
                if (errMsg === null) {
                    const data = <Uint8Array>xhr.response;
                    // proto 解码登录结果
                    const quicklyLoginReply = proto.lobby.MsgQuicklyLoginReply.decode(data);
                    if (quicklyLoginReply.result === 0) {
                        Logger.debug("quickly login ok, switch to lobbyview");
                        this.saveQuicklyLoginReply(quicklyLoginReply);
                        this.showLobbyView();
                    } else {
                        // TODO: show error msg
                        Logger.debug("quickly login error, errCode:", quicklyLoginReply.result);
                        this.showLoginErrMsg(quicklyLoginReply.result);
                    }
                }
            }

            if (errMsg !== null) {
                Logger.debug("quickly login failed:", errMsg);
                // 显示错误对话框
                Dialog.showDialog(errMsg, () => {
                    //
                });
            }
        });
    }

    public saveWxLoginReply(wxLoginReply: proto.lobby.MsgLoginReply): void {
        DataStore.setItem("token", wxLoginReply.token);

        const userInfo = wxLoginReply.userInfo;
        DataStore.setItem("userID", userInfo.userID);
        DataStore.setItem("nickName", userInfo.nickName);
        DataStore.setItem("gender", userInfo.gender);
        DataStore.setItem("province", userInfo.province);
        DataStore.setItem("city", userInfo.city);
        DataStore.setItem("diamond", userInfo.diamond);
        DataStore.setItem("country", userInfo.country);
        DataStore.setItem("headImgUrl", userInfo.headImgUrl);
        DataStore.setItem("phone", userInfo.phone);
    }

    public saveQuicklyLoginReply(quicklyLoginReply: proto.lobby.MsgQuicklyLoginReply): void {
        DataStore.setItem("account", quicklyLoginReply.account);
        DataStore.setItem("token", quicklyLoginReply.token);

        const userInfo = quicklyLoginReply.userInfo;
        DataStore.setItem("userID", userInfo.userID);
        DataStore.setItem("nickName", userInfo.nickName);
        DataStore.setItem("gender", userInfo.gender);
        DataStore.setItem("province", userInfo.province);
        DataStore.setItem("city", userInfo.city);
        DataStore.setItem("diamond", userInfo.diamond);
        DataStore.setItem("country", userInfo.country);
        DataStore.setItem("headImgUrl", userInfo.headImgUrl);
        DataStore.setItem("phone", userInfo.phone);
    }

    public showLobbyView(): void {
        this.destroy();
        this.win.hide();
        this.win.dispose();

        this.addComponent(LobbyView);
    }

    public showLoginErrMsg(errCode: number): void {
        const lobby = proto.lobby;
        const errMsgMap: { [key: string]: string } = {

            [lobby.LoginError.ErrLoginSuccess]: "成功",
            [lobby.LoginError.ErrParamDecode]: "解码参数失败",
            [lobby.LoginError.ErrDecodeUserInfoFailed]: "解码用户信息失败",

            [lobby.LoginError.ErrParamInvalidCode]: "不合法的微信code",
            [lobby.LoginError.ErrParamInvalidEncrypteddata]: "不合法的微信encrypteddata",
            [lobby.LoginError.ErrParamInvalidIv]: "不合法的微信iv",
            [lobby.LoginError.ErrWxAuthFailed]: "微信认证失败",

            [lobby.LoginError.ErrParamAccountIsEmpty]: "输入账号不能为空",
            [lobby.LoginError.ErrParamPasswordIsEmpty]: "输入密码不能为空",
            [lobby.LoginError.ErrAccountNotExist]: "输入账号不存在",
            [lobby.LoginError.ErrAccountNotSetPassword]: "账号没有设置密码，不能登录",
            [lobby.LoginError.ErrPasswordNotMatch]: "密码不匹配，不能登录"
        };

        let errMsg = errMsgMap[errCode];
        if (errMsg !== undefined) {
            errMsg = "登录失败";
        }

        Dialog.showDialog(errMsg);
    }

    protected start(): void {
        this.showLoginView();
    }

    protected onDestroy(): void {
        this.eventTarget.emit("destroy");
    }

    protected onLoad(): void {
        // 构建一个event target用于发出destroy事件
        this.eventTarget = new cc.EventTarget();
    }

    private createWxBtn(): void {
        const btnSize = cc.size(this.weixinButton.width, this.weixinButton.height);
        const frameSize = cc.view.getFrameSize();
        const winSize = cc.winSize;
        const scaleX = frameSize.width / winSize.width;
        const scaleY = frameSize.height / winSize.height;
        const scale = scaleX < scaleY ? scaleX : scaleY;
        const left = this.weixinButton.x * scale;
        const top = this.weixinButton.y * scale;
        const width = btnSize.width * scale;
        const height = btnSize.height * scale;
        this.button = wx.createUserInfoButton({
            type: 'text',
            text: '',
            style: {
                left: left,
                top: top,
                width: width,
                height: height,
                lineHeight: 0,
                // backgroundColor: '#000000',
                // borderColor: '#ff0000',
                // color: '#ffffff',
                textAlign: 'center',
                fontSize: 16,
                borderRadius: 4
            }
        });

        this.button.onTap((res: getUserInfoRes) => {
            this.button.hide();
            SDKManager.instance.login(this.wxLogin.bind(this));
        });
    }
    private wxLogin(result: boolean): void {
        if (!result) {
            console.error('wxlogin error');
            this.button.show();

            return;
        } else {
            const wxLoginUrl = `${LEnv.rootURL}${LEnv.wxLogin}`;
            console.info('wxloginUrl', wxLoginUrl);

            const wxCodeStr = 'wechatLCode';
            const wxUserInfoStr = 'wxUserInfo';
            const wxCode = <string>SDKManager.instance.getDataMap()[wxCodeStr];
            const wxUserData = <getUserInfoRes>SDKManager.instance.getDataMap()[wxUserInfoStr];

            const wxLoginReq = new proto.lobby.MsgWxLogin();
            wxLoginReq.code = wxCode;
            wxLoginReq.iv = wxUserData.iv;
            wxLoginReq.encrypteddata = wxUserData.encryptedData;
            const body = proto.lobby.MsgWxLogin.encode(wxLoginReq).toArrayBuffer();

            HTTP.hPost(
                this.eventTarget,
                wxLoginUrl,
                (xhr: XMLHttpRequest, err: string) => {
                    let errMsg = null;
                    if (err !== null) {
                        errMsg = `登录错误，错误码:${err}`;
                    } else {
                        errMsg = HTTP.hError(xhr);
                        if (errMsg === null) {
                            const data = <Uint8Array>xhr.response;
                            // proto 解码登录结果
                            const wxLoginReply = proto.lobby.MsgLoginReply.decode(data);
                            if (wxLoginReply.result === 0) {
                                Logger.debug("wx login ok, switch to lobbyview");
                                this.saveWxLoginReply(wxLoginReply);
                                this.showLobbyView();
                            } else {
                                // TODO: show error msg
                                Logger.debug("wx login error, errCode:", wxLoginReply.result);
                                this.showLoginErrMsg(wxLoginReply.result);
                            }
                        }
                    }

                    if (errMsg !== null) {
                        Logger.debug("wx login failed:", errMsg);
                        // 显示错误对话框
                        Dialog.showDialog(errMsg, () => {
                            //
                        });
                    }
                },
                "arraybuffer",
                body);
        }
    }
}
