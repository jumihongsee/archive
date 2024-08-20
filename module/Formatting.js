// 전화번호 포맷팅 함수
function formatPhoneNumber(num) {
    if (!num || num.length !== 11) {
        throw new Error('올바른 폰번호가아닌디');
    }
    const firstPart = num.slice(0, 3);  // 처음 3자리 (010)
    const middlePart = num.slice(3, 7); // 그다음 4자리 (0000)
    const lastPart = num.slice(7);      // 마지막 4자리 (0000)

    return `${firstPart}-${middlePart}-${lastPart}`;
}

// 가격 포맷팅 함수
function formatPrice(price) {
    if (isNaN(price)) {
        throw new Error('Invalid price');
    }
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 날짜 포맷팅 함수 (예시: YYYY-MM-DD 형식으로 변환)
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
}




// 모듈 내보내기
module.exports = { formatDate, formatPhoneNumber, formatPrice };