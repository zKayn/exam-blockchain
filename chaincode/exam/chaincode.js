'use strict';

const { Contract } = require('fabric-contract-api');

class ExamContract extends Contract {
  // Khởi tạo dữ liệu
  async initLedger(ctx) {
    console.log('Khởi tạo ledger');
    return;
  }

  // Lưu kết quả bài thi lên blockchain
  async submitExam(ctx, submissionId, studentId, examId, answers, score, timestamp) {
    const submission = {
      submissionId,
      studentId,
      examId,
      answers: JSON.parse(answers),
      score,
      timestamp,
      docType: 'submission'
    };

    // Lưu vào world state
    await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));
    return JSON.stringify(submission);
  }

  // Lấy kết quả bài thi từ blockchain
  async getSubmission(ctx, submissionId) {
    const submissionAsBytes = await ctx.stub.getState(submissionId);
    if (!submissionAsBytes || submissionAsBytes.length === 0) {
      throw new Error(`Không tìm thấy bài nộp với ID: ${submissionId}`);
    }
    return submissionAsBytes.toString();
  }

  // Lấy lịch sử chỉnh sửa của bài thi (nếu có)
  async getSubmissionHistory(ctx, submissionId) {
    const iterator = await ctx.stub.getHistoryForKey(submissionId);
    const results = [];
    
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        record = strValue;
      }
      
      results.push({
        txId: result.value.tx_id,
        timestamp: result.value.timestamp,
        value: record
      });
      
      result = await iterator.next();
    }
    await iterator.close();
    return JSON.stringify(results);
  }

  // Tìm kiếm tất cả bài thi của một học sinh
  async querySubmissionsByStudent(ctx, studentId) {
    return await this.queryWithSelector(ctx, {
      selector: {
        docType: 'submission',
        studentId: studentId
      }
    });
  }

  // Tìm kiếm tất cả bài thi của một kỳ thi
  async querySubmissionsByExam(ctx, examId) {
    return await this.queryWithSelector(ctx, {
      selector: {
        docType: 'submission',
        examId: examId
      }
    });
  }

  // Hàm truy vấn chung
  async queryWithSelector(ctx, queryString) {
    const query = JSON.stringify(queryString);
    const iterator = await ctx.stub.getQueryResult(query);
    
    const results = [];
    let result = await iterator.next();
    
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        record = strValue;
      }
      results.push(record);
      result = await iterator.next();
    }
    
    await iterator.close();
    return JSON.stringify(results);
  }
}

module.exports = ExamContract;