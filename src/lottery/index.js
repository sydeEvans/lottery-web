import "./index.css";
import "../css/animate.min.css";
import "./canvas.js";
import {
  addQipao,
  setPrizes,
  showPrizeList,
  setPrizeData,
  resetPrize,
} from "./prizeList";
import { NUMBER_MATRIX } from "./config.js";
import mockData from "./mock";

const ROTATE_TIME = 1000;
const BASE_HEIGHT = 1080;

let TOTAL_CARDS,
  nowScenes,
  btns = {
    enter: document.querySelector("#enter"),
    lotteryBar: document.querySelector("#lotteryBar"),
  },
  prizes,
  ROW_COUNT = 7,
  COLUMN_COUNT = 17,
  COMPANY,
  HIGHLIGHT_CELL = [],
  // 当前的比例
  Resolution = 1;

let camera,
  scene,
  renderer,
  controls,
  threeDCards = [],
  targets = {
    table: [],
    sphere: [],
  };

let selectedCardIndex = [],
  rotate = false,
  basicData = {
    prizes: [], //奖品信息
    users: [], //所有人员
    luckyUsers: {}, //已中奖人员
    leftUsers: [], //未中奖人员
  },
  // 当前抽的奖项，从最低奖开始抽，直到抽到大奖
  currentPrizeIndex,
  //当前选择的奖品
  currentPrize,
  // 正在抽奖
  isLotting = false,
  currentLuckys = [];

initAll();

/**
 * 初始化所有DOM
 */
function initAll() {
  initStyle();
  startMock();
}
function initStyle() {
  if (mockData.bgVideo) {
    bgVideo.innerHTML = `<video class="bg-video" src="${mockData.bgVideo}" loop="" muted=""
    autoplay=""></video>`;
  }
  body.style.backgroundImage = mockData.background; //背景颜色
}
function startMock() {
  prizes = mockData.prizes; //奖项
  COMPANY = mockData.COMPANY; //公司名
  HIGHLIGHT_CELL = createHighlight();
  basicData.prizes = prizes; //基础奖项配置
  setPrizes(prizes);

  TOTAL_CARDS = ROW_COUNT * COLUMN_COUNT;

  // 读取当前已设置的抽奖结果
  basicData.leftUsers = mockData.leftUsers; //左边用户
  basicData.luckyUsers = mockData.luckyData; //已抽奖用户

  let prizeIndex = basicData.prizes.length - 1;
  for (; prizeIndex > -1; prizeIndex--) {
    if (
      mockData.luckyData[prizeIndex] &&
      mockData.luckyData[prizeIndex].length >=
        basicData.prizes[prizeIndex].count
    ) {
      continue;
    }
    currentPrizeIndex = prizeIndex;
    currentPrize = basicData.prizes[currentPrizeIndex];
    break;
  }
  console.error(currentPrizeIndex, currentPrize);
  showPrizeList(currentPrizeIndex);
  let curLucks = basicData.luckyUsers[currentPrize.type];
  setPrizeData(currentPrizeIndex, curLucks ? curLucks.length : 0, true);

  //setuser
  basicData.users = mockData.user;

  localStorage.setItem("allUser", JSON.stringify(basicData.leftUsers));

  initCards();
  animate();
  shineCard();
}

function initCards() {
  let member = basicData.users,
    length = member.length;

  let isBold = false,
    showTable = basicData.leftUsers.length === basicData.users.length,
    index = 0,
    position = {
      x: (140 * COLUMN_COUNT - 20) / 2,
      y: (180 * ROW_COUNT - 20) / 2,
    };

  camera = new THREE.PerspectiveCamera(
    45,
    mockData.width / mockData.height,
    1,
    10000
  );
  camera.position.z = 3000;

  scene = new THREE.Scene();

  for (let i = 0; i < ROW_COUNT; i++) {
    for (let j = 0; j < COLUMN_COUNT; j++) {
      isBold = HIGHLIGHT_CELL.includes(j + "-" + i);
      var element = createCard(
        member[index % length],
        isBold,
        index,
        showTable
      );

      var object = new THREE.CSS3DObject(element);
      object.position.x = Math.random() * 4000 - 2000;
      object.position.y = Math.random() * 4000 - 2000;
      object.position.z = Math.random() * 4000 - 2000;

      scene.add(object);
      threeDCards.push(object);
      //

      var object = new THREE.Object3D();
      object.position.x = j * 140 - position.x;
      object.position.y = -(i * 180) + position.y;
      targets.table.push(object);
      index++;
    }
  }

  // sphere

  var vector = new THREE.Vector3();

  for (var i = 0, l = threeDCards.length; i < l; i++) {
    var phi = Math.acos(-1 + (2 * i) / l);
    var theta = Math.sqrt(l * Math.PI) * phi;
    var object = new THREE.Object3D();
    object.position.setFromSphericalCoords(800 * Resolution, phi, theta);
    vector.copy(object.position).multiplyScalar(2);
    object.lookAt(vector);
    targets.sphere.push(object);
  }

  renderer = new THREE.CSS3DRenderer();
  renderer.setSize(mockData.width, mockData.height);
  document.getElementById("container").appendChild(renderer.domElement);

  //

  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 0.5;
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener("change", render);

  bindEvent();

  if (showTable) {
    switchScreen("enter");
  } else {
    switchScreen("lottery");
  }
}

function setLotteryStatus(status = false) {
  isLotting = status;
}

function bindEvent() {
  document.querySelector("#menu").addEventListener("click", function (e) {
    e.stopPropagation();
    // 如果正在抽奖，则禁止一切操作'
    let target = e.target.id;

    if (!["reset", "back"].includes(target)) {
      if (isLotting) {
        addQipao("抽慢一点点～～抽奖还没结束");
        return false;
      }
      let perCount = prizes[currentPrizeIndex].eachCount,
        leftCount = basicData.leftUsers.length;
      const notAllowed = perCount > leftCount;

      if (notAllowed) {
        addQipao("池中已经没有人拉,请重置抽奖人员池");
        return false;
      }

      //骇客
      console.log(currentPrize);
    }

    switch (target) {
      // 显示数字墙
      case "welcome":
        switchScreen("enter");
        rotate = false;
        break;
      //返回首页
      case "back":
        switchScreen("enter");

        rotate = false;
        break;
      // 进入抽奖
      case "awards":
        replaceMusic(currentPrize.awards);

        break;
      case "enter":
        removeHighlight();
        addQipao(`马上抽取[${currentPrize.title}],不要走开。`);
        rotate = true;
        switchScreen("lottery");
        break;
      // 重置
      case "reset":
        let doREset = window.confirm(
          "是否确认重置数据，重置后，当前已抽的奖项全部清空？"
        );
        if (!doREset) {
          return;
        }
        addQipao("重置所有数据，重新抽奖");
        addHighlight();
        resetCard();
        // 重置所有数据
        currentLuckys = [];
        basicData.leftUsers = Object.assign([], basicData.users);
        basicData.luckyUsers = {};
        currentPrizeIndex = basicData.prizes.length - 1;
        currentPrize = basicData.prizes[currentPrizeIndex];

        resetPrize(currentPrizeIndex);
        resetMock();
        switchScreen("enter");
        break;
      // 抽奖
      case "lottery":
        //更新状态
        setLotteryStatus(true);
        // 每次抽奖前先保存上一次的抽奖数据
        saveMock();
        //feat@是否还有礼物
        if (!currentPrizeIndex) {
          addQipao(`没有可以抽取的奖品了`);

          let doREset = window.confirm("礼物已经抽完,是否重置礼物？");
          if (!doREset) {
            return;
          } else {
            document.getElementById("reset").click();
          }

          return;
        }
        replaceMusic(currentPrize.enter);
        mockData.setSecret(currentPrize, basicData);
        //更新剩余抽奖数目的数据显示
        changePrize();
        resetCard().then((res) => {
          // 抽奖
          lottery();
        });
        addQipao(`正在抽取[${currentPrize.title}],调整好姿势`);
        break;
      // 重新抽奖
      case "reLottery":
        if (currentLuckys.length === 0) {
          addQipao(`当前还没有抽奖，无法重新抽取喔~~`);
          return;
        }
        addQipao(`重新抽取[${currentPrize.title}],做好准备`);
        setLotteryStatus(true);
        resetCard().then((res) => {
          lottery();
        });
        break;
      // 导出抽奖结果
      case "save":
        saveMock().then((res) => {
          resetCard().then((res) => {
            currentLuckys = [];
          });
          exportData();
          addQipao(`数据已保存到EXCEL中。`);
        });
        break;

      case "result":
        saveMock().then((res) => {
          resetCard().then((res) => {
            currentLuckys = [];
          });
        });

        break;
    }
  });

  window.addEventListener("resize", onWindowResize, false);
}

//场景转换
function switchScreen(type) {
  switch (type) {
    case "enter":
      btns.enter.classList.remove("none");
      btns.lotteryBar.classList.add("none");
      transform(targets.table, 2000);
      break;
    default:
      btns.enter.classList.add("none");
      btns.lotteryBar.classList.remove("none");
      transform(targets.sphere, 2000);
      break;
  }
}

/**
 * 创建元素
 */
function createElement(css, text) {
  let dom = document.createElement("div");
  dom.className = css || "";
  dom.innerHTML = text || "";
  return dom;
}

/**
 * 创建名牌
 */
function createCard(user, isBold, id, showTable) {
  var element = createElement();
  element.id = "card-" + id;

  if (isBold) {
    element.className = "element lightitem";

    if (showTable) {
      element.classList.add("highlight");
    }
    element.style.backgroundColor = mockData.atmosphereGroupCard();
  } else {
    element.className = "element";
    element.style.backgroundColor = mockData.atmosphereGroupCard();
  }
  COMPANY && element.appendChild(createElement("company", COMPANY));

  element.appendChild(createElement("name", user[1]));

  return element;
}

function removeHighlight() {
  document.querySelectorAll(".highlight").forEach((node) => {
    node.classList.remove("highlight");
  });
}

function addHighlight() {
  document.querySelectorAll(".lightitem").forEach((node) => {
    node.classList.add("highlight");
  });
}

/**
 * 渲染地球等
 */
function transform(targets, duration) {
  for (var i = 0; i < threeDCards.length; i++) {
    var object = threeDCards[i];
    var target = targets[i];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  }

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start();
}

//旋转地球
function rotateBall() {
  return new Promise((resolve, reject) => {
    scene.rotation.y = 0;
    new TWEEN.Tween(scene.rotation)
      .to(
        {
          y: Math.PI * ((currentPrize && currentPrize.circle) || 8),
        },
        (currentPrize && currentPrize.ROTATE_TIME) || ROTATE_TIME
      )
      .onUpdate(render)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start()
      .onComplete(() => {
        resolve();
      });
  });
}

function onWindowResize() {
  camera.aspect = mockData.width / mockData.height;
  camera.updateProjectionMatrix();
  renderer.setSize(mockData.width, mockData.height);
  render();
}

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}

function selectCard(duration = 600) {
  rotate = false;
  let width = 140,
    tag = -(currentLuckys.length - 1) / 2,
    locates = [];

  if (currentLuckys.length > 5) {
    let yPosition = [-87, 87],
      l = selectedCardIndex.length,
      mid = Math.ceil(l / 2);
    tag = -(mid - 1) / 2;
    for (let i = 0; i < mid; i++) {
      locates.push({
        x: tag * width * Resolution,
        y: yPosition[0] * Resolution,
      });
      tag++;
    }

    tag = -(l - mid - 1) / 2;
    for (let i = mid; i < l; i++) {
      locates.push({
        x: tag * width * Resolution,
        y: yPosition[1] * Resolution,
      });
      tag++;
    }
  } else {
    for (let i = selectedCardIndex.length; i > 0; i--) {
      locates.push({
        x: tag * width * Resolution,
        y: 0 * Resolution,
      });
      tag++;
    }
  }

  let text = currentLuckys.map((item) => item[1]);
  addQipao(
    `恭喜${text.join("、")}获得${currentPrize.title}, 新的一年必定旺旺旺。`
  );

  selectedCardIndex.forEach((cardIndex, index) => {
    changeCard(cardIndex, currentLuckys[index]);
    var object = threeDCards[cardIndex];
    new TWEEN.Tween(object.position)
      .to(
        {
          x: locates[index].x,
          y: locates[index].y * Resolution,
          z: 2200,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: 0,
          y: 0,
          z: 0,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    object.element.classList.add("prize");
    tag++;
  });

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start()
    .onComplete(() => {
      setLotteryStatus();
    });
}

/**
 * 重置抽奖牌内容
 */
function resetCard(duration = 500) {
  if (currentLuckys.length === 0) {
    return Promise.resolve();
  }

  selectedCardIndex.forEach((index) => {
    let object = threeDCards[index],
      target = targets.sphere[index];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z,
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  });

  return new Promise((resolve, reject) => {
    new TWEEN.Tween(this)
      .to({}, duration * 2)
      .onUpdate(render)
      .start()
      .onComplete(() => {
        selectedCardIndex.forEach((index) => {
          let object = threeDCards[index];
          object.element.classList.remove("prize");
        });
        resolve();
      });
  });
}

/**
 * 抽奖
 */
function lottery() {
  rotateBall().then(() => {
    currentLuckys = [];
    selectedCardIndex = [];
    let perCount = prizes[currentPrizeIndex].eachCount,
      luckyData = basicData.luckyUsers[currentPrize.type],
      leftCount = basicData.leftUsers.length,
      leftPrizeCount = currentPrize.count - (luckyData ? luckyData.length : 0);
    const cloneLeftUsers = JSON.parse(JSON.stringify(basicData.leftUsers));
    if (leftCount === 0) {
      addQipao("人员已抽完，现在重新设置所有人员可以进行二次抽奖！");
      basicData.leftUsers = basicData.users;
      leftCount = basicData.leftUsers.length;
    }
    currentLuckys = lotteryRan(leftCount, perCount).map((index) => {
      return cloneLeftUsers[index];
    });
    console.log(currentLuckys);

    for (let i = 0; i < perCount; i++) {
      leftCount--;
      leftPrizeCount--;

      let cardIndex = random(TOTAL_CARDS);
      while (selectedCardIndex.includes(cardIndex)) {
        cardIndex = random(TOTAL_CARDS);
      }
      selectedCardIndex.push(cardIndex);

      if (leftPrizeCount === 0) {
        break;
      }
    }

    selectCard();
  });
}

function lotteryRan(number, time) {
  var arr = [];
  let Random;
  for (var i = 0; i < time; i++) {
    Random = Math.floor(Math.random() * number);
    if (arr.includes(Random)) {
      i--;
    } else {
      arr.push(Random);
    }
  }
  console.log(arr);
  return arr;
}

function saveMock() {
  if (!currentPrize) {
    return;
  }
  let type = currentPrize.type,
    curLucky = basicData.luckyUsers[type] || [];
  curLucky = curLucky.concat(currentLuckys);
  basicData.luckyUsers[type] = curLucky;

  console.log(
    curLucky.map((item) => item[0]),
    "幸运用户"
  );
  basicData.leftUsers = basicData.leftUsers.filter(
    (human) => !curLucky.map((item) => item[0]).includes(human[0])
  );

  if (currentPrize.count <= curLucky.length) {
    currentPrizeIndex--;
    if (currentPrizeIndex <= -1) {
      currentPrizeIndex = 0;
    }
    currentPrize = basicData.prizes[currentPrizeIndex];
  }

  if (currentLuckys.length > 0) {
    return setLuckyStore(type, currentLuckys, currentPrizeIndex);
  }

  return Promise.resolve();
}

function setLuckyStore(type, currentLuckys, PrizeIndex) {
  const luckyData = JSON.stringify(basicData.luckyUsers);
  localStorage.setItem("luckyData", luckyData);
  const leftUsers = JSON.stringify(basicData.leftUsers);
  localStorage.setItem("leftUsers", leftUsers);
}

function changePrize() {
  let luckys = basicData.luckyUsers[currentPrize.type];
  let luckyCount =
    (luckys ? luckys.length : 0) + prizes[currentPrizeIndex].eachCount;
  setPrizeData(currentPrizeIndex, luckyCount);
}

/**
 * 随机抽奖
 */
function random(num) {
  return Math.floor(Math.random() * num);
}

/**
 * 切换名牌人员信息
 */
function changeCard(cardIndex, user) {
  let card = threeDCards[cardIndex].element;
  const nameDom = `<div class="name">${user[1]}</div>`;
  const idDom = `<div class="details">${user[0]}</div>`;
  const companyDom = `<div class="company">${COMPANY}</div>`;
  card.innerHTML = nameDom + idDom + (COMPANY ? companyDom : "");
}

/**
 * 切换名牌背景
 */
function shine(cardIndex, color) {
  let card = threeDCards[cardIndex].element;
  card.style.backgroundColor = color || mockData.atmosphereGroupCard();
}

/**
 * 随机切换背景和人员信息
 */
function shineCard() {
  let maxCard = 10,
    maxUser;
  let shineCard = 10 + random(maxCard);

  setInterval(() => {
    if (isLotting) {
      return;
    }
    maxUser = basicData.leftUsers.length;
    for (let i = 0; i < shineCard; i++) {
      let index = random(maxUser),
        cardIndex = random(TOTAL_CARDS);
      if (selectedCardIndex.includes(cardIndex)) {
        continue;
      }
      shine(cardIndex);
      changeCard(cardIndex, basicData.leftUsers[index]);
    }
  }, 500);
}

function resetMock() {
  localStorage.clear();
  location.reload();
}

function createHighlight() {
  let year = new Date().getFullYear() + "";
  let step = 4,
    xoffset = 1,
    yoffset = 1,
    highlight = [];

  year.split("").forEach((n) => {
    highlight = highlight.concat(
      NUMBER_MATRIX[n].map((item) => {
        return `${item[0] + xoffset}-${item[1] + yoffset}`;
      })
    );
    xoffset += step;
  });

  return highlight;
}

function replaceMusic(scenes) {
  if (nowScenes == scenes) return;
  let music = document.querySelector("#music");
  music.src = `./data/${scenes}.m4a`;
  musicBox.click();
  nowScenes = scenes;
}

let onload = window.onload;

window.onload = function () {
  onload && onload();

  let music = document.querySelector("#music");
  console.log(music);
  let rotated = 0,
    stopAnimate = false,
    musicBox = document.querySelector("#musicBox");

  function animate() {
    requestAnimationFrame(function () {
      if (stopAnimate) {
        return;
      }
      rotated = rotated % 360;
      musicBox.style.transform = "rotate(" + rotated + "deg)";
      rotated += 1;
      animate();
    });
  }

  musicBox.addEventListener(
    "click",
    function (e) {
      if (music.paused) {
        music.play().then(
          () => {
            stopAnimate = false;
            animate();
          },
          () => {
            addQipao("背景音乐自动播放失败，请手动播放！");
          }
        );
      } else {
        music.pause();
        stopAnimate = true;
      }
    },
    false
  );

  setTimeout(function () {
    replaceMusic("enter-BGM");
  }, 2000);
};
