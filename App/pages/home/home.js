//index.js
const config = require('../../conf.js');
const util = require('../../utils/util.js');
const request = require('../../utils/request.js');

var app = getApp()
Page({
  data: {
      showLoading: false,
      loadingMessage: '',
      showToast: false,
      toastMessage: '',
      imgList: [],
      layoutList: [],
      layoutColumnSize: 3,
      previewing: false,
      previewIndex: 0,
      showingActionsSheet: false,
      inActionImgUrl: '',
      navItems: [],
      navBtnSelectIdx: 0,
      page: 1,
      mid: '',
      hasMore: true,
      scrollTop: 1,
      showLoadMore: false
  },
  showLoading(message) {
      this.setData({ showLoading: true, loadingMessage: message });
  },
  hideLoading() {
      this.setData({ showLoading: false, loadingMessage: '' });
  },
  showToast(toastMessage) {
      this.setData({ showToast: true, toastMessage });
  },
  hideToast() {
      this.setData({ showToast: false, toastMessage: '' });
  },
  renderImgList() {
      let layoutColumnSize = this.data.layoutColumnSize;
      let layoutList = [];
      if (this.data.imgList.length) {
          layoutList = util.matrixArr((this.data.imgList), layoutColumnSize);
          let lastRow = layoutList[layoutList.length - 1];
          if (lastRow.length < layoutColumnSize) {
              let supplement = Array(layoutColumnSize - lastRow.length).fill(0);
              lastRow.push(...supplement);
          }
      }
      this.setData({ layoutList });
  },
  fetchTags() {
      this.showLoading('loading...');
      console.log('url: ' + util.getUrl('/tags'));
      return request({ method: 'GET', url: util.getUrl('/tags') });
  },
  fetchImgs(cid) {
      this.showLoading('loading...');
      return request({ method: 'GET', url: util.getUrl('/girls', [{c:!util.isEmpty(cid)?cid:'xinggan'}, {p:this.data.page}, {m: this.data.mid}])});
  },
  showPreview(event) {
      if (this.data.showActionsSheet) {
          return;
      }
      let index = event.target.dataset.index;
      if (index > this.data.imgList.length - 1) {
          return;
      }
      let previewIndex = this.data.imgList[index];
      this.setData({ previewing: true, previewIndex: index });
  },
  dismissPreview() {
      if (this.data.showingActionsSheet) {
          return;
      }
      this.setData({ previewing: false, previewIndex: 0 });
  },
  dismissActionSheet() {
      this.setData({ showingActionsSheet: false, inActionImgUrl: '' });
  },
  showActionSheet(event) {
      this.setData({ showingActionsSheet: true, inActionImgUrl: event.target.dataset.largesrc });
  },
  saveImage() {
      this.showLoading('saving image...');
      console.log('download_image_url', this.data.inActionImgUrl);

      wx.downloadFile({
          url: this.data.inActionImgUrl,
          type: 'image',
          success: (resp) => {
              wx.saveFile({
                  tempFilePath: resp.tempFilePath,
                  success: (resp) => {
                      this.showToast('save successfully...');
                  },
                  fail: (resp) => {
                      console.log('failed to save, try again...', resp);
                  },
                  complete: (resp) => {
                      console.log('complete', resp);
                      this.hideLoading();
                  },
              });
          },

          fail: (resp) => {
              console.log('fail', resp);
          },
      });
      this.setData({ showingActionsSheet: false, inActionImgUrl: '' });
  },
  scroll(e) {
      this.setData({ scrollTop: e.detail.scrollTop});
  },
  navItemTap(e){
      this.setData({
          scrollTop: -39,
      });
      let index = e.target.dataset.index;
      let cid = e.target.dataset.cid;
      if (index != this.navBtnSelectIdx) {
          this.setData({navBtnSelectIdx: index, page: 1, mid: ''});
          this.fetchImgs(cid).then(resp => {
              this.imgRespHandler(resp, true);
          });
      }
  },
  imgRespHandler(resp, flush) {
      this.hideLoading();
      if (resp.code != 0) {
          this.showToast('load failed, try again...');
          this.setData({page: this.data.page--});
          return;
      }
      if (util.isEmpty(resp.data)) {
          this.setData({hasMore: false});
          this.showToast('all loaded...');
          this.setData({page: this.data.page--});
          return;
      }
      this.showToast('load successfully');
      for (var index in resp.data) {
          resp.data[index].largeSrc = util.imgUrlFix(resp.data[index].largeSrc);
          resp.data[index].thumbSrc = util.imgUrlFix(resp.data[index].thumbSrc);
          resp.data[index].smallSrc = util.imgUrlFix(resp.data[index].smallSrc);
      }
      this.setData({ 'imgList': flush ? resp.data : this.data.imgList.concat(resp.data), 'mid': resp.mid });
      this.renderImgList();
  },
  onPullDownRefresh() {
      this.loadImgData(true);
  },
  loadMoreEvent() {
      this.setData( {
          showLoadMore: true,
          page: this.data.page + 1
      });
      this.loadImgData(false);
  },
  loadImgData(flush) {
      var cid;
      if (!util.isEmpty(this.data.navItems)) {
          cid = this.data.navItems[this.data.navBtnSelectIdx].cid;
      }
      this.fetchImgs(cid).then((resp) => {
          this.imgRespHandler(resp, flush);
      });
  },
  loadTagData() {
      this.fetchTags().then((resp) => {
          this.hideLoading();
          if (resp.code !== 0) {
              this.showToast('load failed, try again...');
              return;
          }
          this.setData({'navItems': resp.data});
      });
  },
  onLoad() {
      this.renderImgList();
      this.loadTagData();
      this.loadImgData();
  }
})
