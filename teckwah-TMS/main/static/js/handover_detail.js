document.addEventListener('DOMContentLoaded', function () {
  const deleteBtn = document.getElementById('deleteHandoverBtn');
  const deleteDialog = document.getElementById('deleteConfirmDialog');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const deleteForm = document.getElementById('deleteHandoverForm'); // ID로 Form 선택

  // 삭제 버튼 클릭 시 확인 대화상자 표시
  deleteBtn?.addEventListener('click', () => {
    deleteDialog?.classList.add('active');
  });

  // 취소 버튼 클릭 시 대화상자 닫기
  cancelDeleteBtn?.addEventListener('click', () => {
    deleteDialog?.classList.remove('active');
  });

  // 다이얼로그 외부 클릭 시 닫기 (선택적)
  deleteDialog?.addEventListener('click', (e) => {
    if (e.target === deleteDialog) {
      deleteDialog.classList.remove('active');
    }
  });

  // Form 제출은 HTML 기본 동작에 맡김 (onsubmit="return confirm(...)" 방식 대신 사용)
  // 만약 form 제출 전에 추가 로직 (예: 락 확인)이 필요하면 여기서 submit 이벤트를 가로채야 함
  // deleteForm?.addEventListener('submit', (e) => {
  //     // e.preventDefault(); // 기본 제출 막기
  //     // 추가 로직...
  //     // if (confirm(...)) { deleteForm.submit(); }
  // });
});
