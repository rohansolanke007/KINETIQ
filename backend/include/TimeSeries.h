#ifndef TIME_SERIES_H
#define TIME_SERIES_H

#include <cstddef>
#include <stdexcept>
#include <vector>

// TimeSeries<T>
// ----------------------------------------------------------------
// A fixed-capacity circular buffer. When full, pushing a new element
// silently discards the OLDEST one, so long-running simulations record
// data in bounded memory (the sandbox's undo stack, by contrast, grows
// without limit).
//
// OOP concept demonstrated: CLASS TEMPLATE. The same container stores
// plain numbers, rows of samples, or any copyable type.
//
// Index 0 is always the oldest retained element.
// ----------------------------------------------------------------
template <typename T>
class TimeSeries {
public:
    explicit TimeSeries(std::size_t capacity = 1024)
        : data_(capacity == 0 ? 1 : capacity), head_(0), size_(0) {}

    void push_back(const T& value) {
        const std::size_t cap = data_.size();
        data_[(head_ + size_) % cap] = value;
        if (size_ < cap) {
            ++size_;
        } else {
            head_ = (head_ + 1) % cap; // overwrite oldest
        }
    }

    const T& operator[](std::size_t index) const { return data_[(head_ + index) % data_.size()]; }

    const T& at(std::size_t index) const {
        if (index >= size_) throw std::out_of_range("TimeSeries index out of range");
        return (*this)[index];
    }

    const T& back() const {
        if (size_ == 0) throw std::out_of_range("TimeSeries is empty");
        return (*this)[size_ - 1];
    }

    std::size_t size() const { return size_; }
    std::size_t capacity() const { return data_.size(); }
    bool empty() const { return size_ == 0; }

    void clear() {
        head_ = 0;
        size_ = 0;
    }

private:
    std::vector<T> data_;
    std::size_t head_;
    std::size_t size_;
};

#endif // TIME_SERIES_H
